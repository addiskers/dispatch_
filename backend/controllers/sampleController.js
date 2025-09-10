const Sample = require('../models/Sample');
const Contact = require('../models/Contact');
const User = require('../models/User');
const { generatePresignedUrl } = require('./generatePresignedUrlFile');
const { sendNotificationEmail } = require('../utils/emailService');
const multer = require("multer");
const multerS3 = require("multer-s3-v3");
const s3 = require("../config/s3");

const convertToIST = (utcDate) => {
  const date = new Date(utcDate);
  date.setHours(date.getHours() + 5);
  date.setMinutes(date.getMinutes() + 30);
  return date;
};

const getCurrentIST = () => {
  const now = new Date();
  return convertToIST(now);
};

const parseISTDate = (istDateString) => {
  if (istDateString instanceof Date) {
    return istDateString;
  }
  if (istDateString.includes('+05:30')) {
    return new Date(istDateString);
  }
  const date = new Date(istDateString);
  date.setHours(date.getHours() - 5);
  date.setMinutes(date.getMinutes() - 30);
  return date;
};

const calculateTimeDifference = (startTime, endTime) => {
  const timeDiff = endTime - startTime;
  const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutesDiff = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const daysDiff = Math.floor(hoursDiff / 24);
  const remainingHours = hoursDiff % 24;
  let formatted;
  if (daysDiff > 0) {
    formatted = `${daysDiff}d ${remainingHours}h ${minutesDiff}m`;
  } else {
    formatted = `${hoursDiff}h ${minutesDiff}m`;
  }
  return {
    totalHours: hoursDiff,
    hours: remainingHours,
    minutes: minutesDiff,
    days: daysDiff,
    formatted
  };
};

const sampleUpload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME,
    key: function (req, file, cb) {
      const timestamp = Date.now();
      const uniqueName = `samples/${req.params.id}/${timestamp}-${file.originalname}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 200 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

const requirementUpload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME,
    key: function (req, file, cb) {
      const timestamp = Date.now();
      const sampleId = req.params.id;
      const uniqueName = `samples/${sampleId}/requirements/${timestamp}-${file.originalname}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed for requirements'), false);
    }
  }
});

const sendSampleRequestNotification = async (sample, requestingUser) => {
  try {
    const uploaders = await User.find({ role: "uploader" }).select("email username");
    const salesPersons = await User.find({ role: "sales" }).select("email username");
    const recipients = [
      ...uploaders.map(user => user.email),
      ...salesPersons.map(user => user.email)
    ].filter(Boolean);
    const ccList = ['samples@skyquestt.com'];
    const subject = `New Sample Request - ${sample.sampleId}: ${sample.reportName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">New Sample Request</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #34495e; margin-top: 0;">Sample Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; font-weight: bold;">Sample ID:</td><td>${sample.sampleId}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Report Name:</td><td>${sample.reportName}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Client Company:</td><td>${sample.clientCompany}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Sales Person:</td><td>${sample.salesPerson}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Priority:</td><td style="text-transform: uppercase; color: ${getPriorityColor(sample.priority)};">${sample.priority}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Industry:</td><td>${sample.reportIndustry}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Country:</td><td>${sample.clientCountry}</td></tr>
            ${sample.dueDate ? `<tr><td style="padding: 8px 0; font-weight: bold;">Due Date:</td><td>${convertToIST(sample.dueDate).toLocaleDateString()}</td></tr>` : ''}
          </table>
        </div>
        <div style="background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #2980b9; margin-top: 0;">Sales Requirement</h4>
          <p style="margin: 0;">${sample.salesRequirement}</p>
        </div>
        ${sample.contactRequirement ? `
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #856404; margin-top: 0;">Contact Research Requirement</h4>
          <p style="margin: 0;">${sample.contactRequirement}</p>
        </div>
        ` : ''}
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Requested by:</strong> ${requestingUser.username} (${requestingUser.email})</p>
          <p style="margin: 5px 0 0 0;"><strong>Requested on:</strong> ${convertToIST(sample.requestedAt).toLocaleString()}</p>
        </div>
        <p style="color: #7f8c8d;">Please log in to the system to view full details and upload sample files.</p>
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        <p style="color: #95a5a6; font-size: 12px; text-align: center;">
          This is an automated notification from the Sample Management System
        </p>
      </div>
    `;
    await sendNotificationEmail(recipients, subject, html, false, ccList);
    console.log(`Sample request notification sent for ${sample.sampleId}`);
  } catch (error) {
    console.error('Error sending sample request notification:', error);
  }
};

const sendSampleCompletionNotification = async (sample, completingUser) => {
  try {
    const salesPersons = await User.find({ role: "sales" }).select("email username");
    const requestingUser = await User.findById(sample.requestedBy).select("email username");
    let recipients = salesPersons.map(user => user.email);
    if (requestingUser && !recipients.includes(requestingUser.email)) {
      recipients.push(requestingUser.email);
    }
    recipients = recipients.filter(Boolean);
    const ccList = ['samples@skyquestt.com'];
    const subject = `Sample Completed - ${sample.sampleId}: ${sample.reportName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Sample Request Completed ✅</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #34495e; margin-top: 0;">Sample Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; font-weight: bold;">Sample ID:</td><td>${sample.sampleId}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Report Name:</td><td>${sample.reportName}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Client Company:</td><td>${sample.clientCompany}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Sales Person:</td><td>${sample.salesPerson}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Files Uploaded:</td><td>${sample.sampleFiles ? sample.sampleFiles.length : 0} files</td></tr>
          </table>
        </div>
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #155724; margin-top: 0;">Completion Details</h4>
          <p style="margin: 0;"><strong>Completed by:</strong> ${completingUser.username} (${completingUser.email})</p>
          <p style="margin: 5px 0 0 0;"><strong>Completed on:</strong> ${getCurrentIST().toLocaleString()}</p>
        </div>
        <p style="color: #7f8c8d;">The sample files are now available for download in the system.</p>
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        <p style="color: #95a5a6; font-size: 12px; text-align: center;">
          This is an automated notification from the Sample Management System
        </p>
      </div>
    `;
    await sendNotificationEmail(recipients, subject, html, false, ccList);
    console.log(`Sample completion notification sent for ${sample.sampleId}`);
  } catch (error) {
    console.error('Error sending sample completion notification:', error);
  }
};

const getPriorityColor = (priority) => {
  const colors = {
    low: '#4caf50',
    medium: '#ff9800',
    high: '#f44336',
    urgent: '#e91e63'
  };
  return colors[priority] || '#9e9e9e';
};

const createSampleRequest = async (req, res) => {
  try {
    const {
      contactId,
      reportName,
      querySource = 'SQ',
      reportIndustry,
      salesPerson,
      clientCompany,
      clientDesignation,
      clientDepartment,
      clientCountry,
      salesRequirement, 
      priority = 'medium',
      dueDate,
      tags = []
    } = req.body;
    if (!contactId || !reportName || !reportIndustry || !salesPerson || 
        !clientCompany || !clientDesignation || !clientCountry) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: contactId, reportName, reportIndustry, salesPerson, clientCompany, clientDesignation, clientCountry'
      });
    }
    const contact = await Contact.findOne({ id: contactId });
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    const contactRequirement = contact.custom_field?.cf_research_requirement;
    const sampleCount = await Sample.countDocuments();
    const sampleId = `${querySource}-SAMPLE-${(sampleCount + 1).toString().padStart(6, '0')}`;
    const requestingUser = await User.findById(req.user.userId).select('username email');
    const sample = new Sample({
      sampleId,
      contactId,
      reportName,
      querySource,
      reportIndustry,
      salesPerson,
      clientCompany,
      clientDesignation,
      clientDepartment: clientDepartment || 'Not Specified',
      clientCountry,
      salesRequirement: salesRequirement || '',
      contactRequirement,
      requestedBy: req.user.userId,
      priority,
      dueDate: dueDate ? parseISTDate(dueDate) : null,
      tags,
      requirementFiles: [],
      requestedAt: getCurrentIST()
    });
    await sample.save();
    const populatedSample = await Sample.findById(sample._id)
      .populate('requestedBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('completedBy', 'username email');
    await sendSampleRequestNotification(populatedSample, requestingUser);
    res.status(201).json({
      success: true,
      message: 'Sample request created successfully',
      data: populatedSample
    });
  } catch (error) {
    console.error('Error creating sample request:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating sample request',
      error: error.message
    });
  }
};

const getAllSamples = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      querySource,
      salesPerson,
      priority,
      startDate,
      endDate,
      search = '',
      sortBy = 'requestedAt',
      sortOrder = 'desc'
    } = req.query;
    const query = {};
    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else {
        query.status = status;
      }
    }
    if (querySource) {
      query.querySource = querySource;
    }
    if (salesPerson) {
      query.salesPerson = { $regex: salesPerson, $options: 'i' };
    }
    if (priority) {
      query.priority = priority;
    }
    if (search) {
      query.$or = [
        { reportName: { $regex: search, $options: 'i' } },
        { clientCompany: { $regex: search, $options: 'i' } },
        { salesRequirement: { $regex: search, $options: 'i' } },
        { sampleId: { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      query.requestedAt = {};
      if (startDate) query.requestedAt.$gte = parseISTDate(startDate);
      if (endDate) query.requestedAt.$lte = parseISTDate(endDate);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await Sample.countDocuments(query);
    const samples = await Sample.find(query)
      .populate('requestedBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('completedBy', 'username email')
      .populate('sampleFiles.uploadedBy', 'username email')
      .populate('requirementFiles.uploadedBy', 'username email')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const contactIds = samples.map(sample => sample.contactId);
    const contacts = await Contact.find({ id: { $in: contactIds } }).select('id created_at');
    const contactMap = contacts.reduce((map, contact) => {
      map[contact.id] = contact;
      return map;
    }, {});
    const samplesWithTiming = samples.map(sample => {
      const sampleObj = sample.toObject();
      const contact = contactMap[sample.contactId];
      if (contact && contact.created_at) {
        const contactCreatedAt = parseISTDate(contact.created_at);
        const sampleRequestedAt = convertToIST(sampleObj.requestedAt);
        const timeSinceContactCreation = calculateTimeDifference(contactCreatedAt, sampleRequestedAt);
        sampleObj.timeSinceContactCreation = {
          ...timeSinceContactCreation,
          contactCreatedAt: contactCreatedAt.toISOString(),
          sampleRequestedAt: sampleRequestedAt.toISOString(),
          formatted: `${timeSinceContactCreation.formatted} (from contact creation)`
        };
      } else {
        sampleObj.timeSinceContactCreation = {
          formatted: 'Contact data not available',
          error: true
        };
      }
      if (sampleObj.requestedAt) {
        sampleObj.requestedAtIST = convertToIST(sampleObj.requestedAt).toISOString();
      }
      if (sampleObj.completedAt) {
        sampleObj.completedAtIST = convertToIST(sampleObj.completedAt).toISOString();
      }
      if (sampleObj.dueDate) {
        sampleObj.dueDateIST = convertToIST(sampleObj.dueDate).toISOString();
      }
      if (sampleObj.sampleFiles) {
        sampleObj.sampleFiles = sampleObj.sampleFiles.map(file => ({
          ...file,
          uploadedAtIST: convertToIST(file.uploadedAt).toISOString()
        }));
      }
      if (sampleObj.requirementFiles) {
        sampleObj.requirementFiles = sampleObj.requirementFiles.map(file => ({
          ...file,
          uploadedAtIST: convertToIST(file.uploadedAt).toISOString()
        }));
      }
      return sampleObj;
    });
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    res.json({
      success: true,
      data: samplesWithTiming,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching samples:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching samples',
      error: error.message
    });
  }
};

const getSampleById = async (req, res) => {
  try {
    const { id } = req.params;
    const sample = await Sample.findById(id)
      .populate('requestedBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('completedBy', 'username email')
      .populate('notes.author', 'username email')
      .populate('sampleFiles.uploadedBy', 'username email')
      .populate('requirementFiles.uploadedBy', 'username email');
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: 'Sample not found'
      });
    }
    const contact = await Contact.findOne({ id: sample.contactId }).select('id created_at');
    const sampleObj = sample.toObject();
    if (contact && contact.created_at) {
      const contactCreatedAt = parseISTDate(contact.created_at);
      const sampleRequestedAt = convertToIST(sampleObj.requestedAt);
      const timeSinceContactCreation = calculateTimeDifference(contactCreatedAt, sampleRequestedAt);
      sampleObj.timeSinceContactCreation = {
        ...timeSinceContactCreation,
        contactCreatedAt: contactCreatedAt.toISOString(),
        sampleRequestedAt: sampleRequestedAt.toISOString(),
        formatted: `${timeSinceContactCreation.formatted} (from contact creation)`
      };
    }
    if (sampleObj.requestedAt) {
      sampleObj.requestedAtIST = convertToIST(sampleObj.requestedAt).toISOString();
    }
    if (sampleObj.completedAt) {
      sampleObj.completedAtIST = convertToIST(sampleObj.completedAt).toISOString();
    }
    if (sampleObj.dueDate) {
      sampleObj.dueDateIST = convertToIST(sampleObj.dueDate).toISOString();
    }
    res.json({
      success: true,
      data: sampleObj
    });
  } catch (error) {
    console.error('Error fetching sample:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sample',
      error: error.message
    });
  }
};

const updateSampleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, assignedTo, dueDate, priority, salesRequirement } = req.body;
    const sample = await Sample.findById(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: 'Sample not found'
      });
    }
    const updatingUser = await User.findById(req.user.userId).select('username email');
    if (status) {
      sample.status = status;
      if (status === 'done') {
        sample.completedBy = req.user.userId;
        sample.completedAt = getCurrentIST();
        await sendSampleCompletionNotification(sample, updatingUser);
      }
    }
    if (assignedTo) sample.assignedTo = assignedTo;
    if (dueDate) sample.dueDate = parseISTDate(dueDate);
    if (priority) sample.priority = priority;
    if (salesRequirement !== undefined) sample.salesRequirement = salesRequirement;
    if (notes) {
      sample.notes.push({
        message: notes,
        author: req.user.userId,
        createdAt: getCurrentIST()
      });
    }
    await sample.save();
    const updatedSample = await Sample.findById(id)
      .populate('requestedBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('completedBy', 'username email');
    res.json({
      success: true,
      message: 'Sample updated successfully',
      data: updatedSample
    });
  } catch (error) {
    console.error('Error updating sample:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating sample',
      error: error.message
    });
  }
};

const uploadSampleFiles = [
  sampleUpload.array('files', 10),
  async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }
      const sample = await Sample.findById(id);
      if (!sample) {
        return res.status(404).json({
          success: false,
          message: 'Sample not found'
        });
      }
      if (!['uploader', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only uploaders can upload sample files.'
        });
      }
      const uploadedFiles = files.map(file => ({
        filename: file.key.split('/').pop(),
        originalName: file.originalname,
        fileKey: file.key,
        uploadedBy: req.user.userId,
        uploadedAt: getCurrentIST()
      }));
      sample.sampleFiles.push(...uploadedFiles);
      if (sample.status === 'requested') {
        sample.status = 'in_progress';
      }
      await sample.save();
      const updatedSample = await Sample.findById(id)
        .populate('requestedBy', 'username email')
        .populate('assignedTo', 'username email')
        .populate('completedBy', 'username email')
        .populate('sampleFiles.uploadedBy', 'username email');
      res.json({
        success: true,
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        data: updatedSample
      });
    } catch (error) {
      console.error('Error uploading sample files:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading files',
        error: error.message
      });
    }
  }
];

const uploadSampleFile = [
  sampleUpload.single('file'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
      const sample = await Sample.findById(id);
      if (!sample) {
        return res.status(404).json({
          success: false,
          message: 'Sample not found'
        });
      }
      if (!['uploader', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only uploaders can upload sample files.'
        });
      }
      sample.sampleFiles.push({
        filename: file.key.split('/').pop(),
        originalName: file.originalname,
        fileKey: file.key,
        uploadedBy: req.user.userId,
        uploadedAt: getCurrentIST()
      });
      if (sample.status === 'requested') {
        sample.status = 'in_progress';
      }
      await sample.save();
      const updatedSample = await Sample.findById(id)
        .populate('requestedBy', 'username email')
        .populate('assignedTo', 'username email')
        .populate('completedBy', 'username email')
        .populate('sampleFiles.uploadedBy', 'username email');
      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: updatedSample
      });
    } catch (error) {
      console.error('Error uploading sample file:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading file',
        error: error.message
      });
    }
  }
];

const uploadRequirementFiles = [
  requirementUpload.array('requirementFiles', 5),
  async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No requirement files uploaded'
        });
      }
      const sample = await Sample.findById(id);
      if (!sample) {
        return res.status(404).json({
          success: false,
          message: 'Sample not found'
        });
      }
      if (!['sales', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only sales and superadmin users can upload requirement files.'
        });
      }
      const uploadedFiles = files.map(file => ({
        filename: file.key.split('/').pop(),
        originalName: file.originalname,
        fileKey: file.key,
        uploadedBy: req.user.userId,
        uploadedAt: getCurrentIST()
      }));
      if (!sample.requirementFiles) {
        sample.requirementFiles = [];
      }
      sample.requirementFiles.push(...uploadedFiles);
      await sample.save();
      const updatedSample = await Sample.findById(id)
        .populate('requestedBy', 'username email')
        .populate('assignedTo', 'username email')
        .populate('completedBy', 'username email')
        .populate('requirementFiles.uploadedBy', 'username email');
      res.json({
        success: true,
        message: `${uploadedFiles.length} requirement file(s) uploaded successfully`,
        data: updatedSample
      });
    } catch (error) {
      console.error('Error uploading requirement files:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading requirement files',
        error: error.message
      });
    }
  }
];

const downloadSampleFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const sample = await Sample.findById(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: 'Sample not found'
      });
    }
    const file = sample.sampleFiles.id(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    const downloadUrl = await generatePresignedUrl(file.fileKey);
    res.json({
      success: true,
      downloadUrl,
      filename: file.originalName
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating download URL',
      error: error.message
    });
  }
};

const downloadMultipleSampleFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileIds } = req.body;
    const sample = await Sample.findById(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: 'Sample not found'
      });
    }
    if (!fileIds || fileIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No file IDs provided'
      });
    }
    const downloadUrls = [];
    for (const fileId of fileIds) {
      const file = sample.sampleFiles.id(fileId);
      if (file) {
        const downloadUrl = await generatePresignedUrl(file.fileKey);
        downloadUrls.push({
          fileId: file._id,
          filename: file.originalName,
          downloadUrl
        });
      }
    }
    res.json({
      success: true,
      files: downloadUrls
    });
  } catch (error) {
    console.error('Error generating download URLs:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating download URLs',
      error: error.message
    });
  }
};

const downloadRequirementFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const sample = await Sample.findById(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: 'Sample not found'
      });
    }
    const file = sample.requirementFiles.id(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Requirement file not found'
      });
    }
    const downloadUrl = await generatePresignedUrl(file.fileKey);
    res.json({
      success: true,
      downloadUrl,
      filename: file.originalName
    });
  } catch (error) {
    console.error('Error generating requirement file download URL:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating download URL',
      error: error.message
    });
  }
};

const getSampleStats = async (req, res) => {
  try {
    const stats = await Sample.aggregate([
      {
        $group: {
          _id: null,
          totalSamples: { $sum: 1 },
          requestedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'requested'] }, 1, 0] }
          },
          inProgressCount: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);
    const statusDistribution = await Sample.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    const sourceDistribution = await Sample.aggregate([
      {
        $group: {
          _id: '$querySource',
          count: { $sum: 1 }
        }
      }
    ]);
    const priorityDistribution = await Sample.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);
    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalSamples: 0,
          requestedCount: 0,
          inProgressCount: 0,
          completedCount: 0,
          cancelledCount: 0
        },
        statusDistribution,
        sourceDistribution,
        priorityDistribution
      }
    });
  } catch (error) {
    console.error('Error fetching sample statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

const deleteSample = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only superadmin can delete samples.'
      });
    }
    const sample = await Sample.findByIdAndDelete(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: 'Sample not found'
      });
    }
    res.json({
      success: true,
      message: 'Sample deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sample:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting sample',
      error: error.message
    });
  }
};

const getSampleStatusByContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const samples = await Sample.find({ contactId })
      .select('sampleId status requestedAt completedAt')
      .sort({ requestedAt: -1 });
    const samplesWithIST = samples.map(sample => ({
      ...sample.toObject(),
      requestedAtIST: convertToIST(sample.requestedAt).toISOString(),
      completedAtIST: sample.completedAt ? convertToIST(sample.completedAt).toISOString() : null
    }));
    res.json({
      success: true,
      data: samplesWithIST
    });
  } catch (error) {
    console.error('Error fetching sample status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sample status',
      error: error.message
    });
  }
};

module.exports = {
  createSampleRequest,
  getAllSamples,
  getSampleById,
  updateSampleStatus,
  uploadSampleFile,
  uploadSampleFiles,
  uploadRequirementFiles,
  downloadSampleFile,
  downloadMultipleSampleFiles,
  downloadRequirementFile,
  getSampleStats,
  deleteSample,
  getSampleStatusByContact
};