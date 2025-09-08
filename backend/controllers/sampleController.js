// controllers/sampleController.js
const Sample = require('../models/Sample');
const Contact = require('../models/Contact');
const User = require('../models/User');
const { generatePresignedUrl } = require('./generatePresignedUrlFile');
const multer = require("multer");
const multerS3 = require("multer-s3-v3");
const s3 = require("../config/s3");

// Configure multer for sample file uploads
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
    fileSize: 200 * 1024 * 1024 // 200MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image formats
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

// Create a new sample request
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
      clientRequirement,
      priority = 'medium',
      dueDate,
      tags = []
    } = req.body;

    // Validate required fields
    if (!contactId || !reportName || !reportIndustry || !salesPerson || 
        !clientCompany || !clientDesignation || !clientCountry || !clientRequirement) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if contact exists
    const contact = await Contact.findOne({ id: contactId });
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Generate unique sample ID
    const sampleCount = await Sample.countDocuments();
    const sampleId = `${querySource}-SAMPLE-${(sampleCount + 1).toString().padStart(6, '0')}`;

    // Create sample
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
      clientRequirement,
      requestedBy: req.user.userId,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      tags
    });

    await sample.save();

    // Populate the sample with user details
    const populatedSample = await Sample.findById(sample._id)
      .populate('requestedBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('completedBy', 'username email');

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

// Get all samples with filtering and timing calculations
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

    // Build query
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
        { clientRequirement: { $regex: search, $options: 'i' } },
        { sampleId: { $regex: search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      query.requestedAt = {};
      if (startDate) query.requestedAt.$gte = new Date(startDate);
      if (endDate) query.requestedAt.$lte = new Date(endDate);
    }

    // Role-based access control
    if (req.user.role === 'sales') {
      // Sales users can only see their own samples
      const user = await User.findById(req.user.userId);
      if (user) {
        query.salesPerson = { $regex: user.username, $options: 'i' };
      }
    }
    // superadmin and uploader can see all samples

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await Sample.countDocuments(query);

    const samples = await Sample.find(query)
      .populate('requestedBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('completedBy', 'username email')
      .populate('sampleFiles.uploadedBy', 'username email')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate timing for each sample
    const samplesWithTiming = samples.map(sample => {
      const sampleObj = sample.toObject();
      
      // Calculate time between request and first upload
      if (sampleObj.sampleFiles && sampleObj.sampleFiles.length > 0) {
        const firstUpload = sampleObj.sampleFiles.sort((a, b) => 
          new Date(a.uploadedAt) - new Date(b.uploadedAt)
        )[0];
        
        const timeDiff = new Date(firstUpload.uploadedAt) - new Date(sampleObj.requestedAt);
        const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutesDiff = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        sampleObj.timeToFirstUpload = {
          hours: hoursDiff,
          minutes: minutesDiff,
          formatted: `${hoursDiff}h ${minutesDiff}m`
        };
      } else {
        // Calculate time since request if no upload yet
        const timeDiff = new Date() - new Date(sampleObj.requestedAt);
        const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutesDiff = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        sampleObj.timeSinceRequest = {
          hours: hoursDiff,
          minutes: minutesDiff,
          formatted: `${hoursDiff}h ${minutesDiff}m (pending)`
        };
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

// Get sample by ID
const getSampleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const sample = await Sample.findById(id)
      .populate('requestedBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('completedBy', 'username email')
      .populate('notes.author', 'username email')
      .populate('sampleFiles.uploadedBy', 'username email');

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: 'Sample not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'sales') {
      const user = await User.findById(req.user.userId);
      if (user && !sample.salesPerson.toLowerCase().includes(user.username.toLowerCase())) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: sample
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

// Update sample status
const updateSampleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, assignedTo, dueDate, priority } = req.body;

    const sample = await Sample.findById(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: 'Sample not found'
      });
    }

    // Check permissions
    if (req.user.role === 'sales') {
      const user = await User.findById(req.user.userId);
      if (user && !sample.salesPerson.toLowerCase().includes(user.username.toLowerCase())) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Update fields
    if (status) {
      sample.status = status;
      if (status === 'done') {
        sample.completedBy = req.user.userId;
        sample.completedAt = new Date();
      }
    }
    
    if (assignedTo) sample.assignedTo = assignedTo;
    if (dueDate) sample.dueDate = new Date(dueDate);
    if (priority) sample.priority = priority;

    // Add note if provided
    if (notes) {
      sample.notes.push({
        message: notes,
        author: req.user.userId
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

// Upload multiple files to sample
const uploadSampleFiles = [
  sampleUpload.array('files', 10), // Allow up to 10 files
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

      // Check permissions - only uploader and superadmin can upload files
      if (!['uploader', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only uploaders can upload sample files.'
        });
      }

      // Process each uploaded file
      const uploadedFiles = files.map(file => ({
        filename: file.key.split('/').pop(),
        originalName: file.originalname,
        fileKey: file.key,
        uploadedBy: req.user.userId
      }));

      // Add all files to sample
      sample.sampleFiles.push(...uploadedFiles);

      // If this is the first upload and status is requested, update to in_progress
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

// Single file upload (backward compatibility)
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

      // Check permissions - only uploader and superadmin can upload files
      if (!['uploader', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only uploaders can upload sample files.'
        });
      }

      // Add file info to sample
      sample.sampleFiles.push({
        filename: file.key.split('/').pop(),
        originalName: file.originalname,
        fileKey: file.key,
        uploadedBy: req.user.userId
      });

      // If this is the first file and status is requested, update to in_progress
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

// Download sample file
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

    // Check access permissions
    if (req.user.role === 'sales') {
      const user = await User.findById(req.user.userId);
      if (user && !sample.salesPerson.toLowerCase().includes(user.username.toLowerCase())) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const file = sample.sampleFiles.id(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Generate presigned URL for download
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

// Download multiple files as ZIP
const downloadMultipleSampleFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileIds } = req.body; // Array of file IDs to download
    
    const sample = await Sample.findById(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: 'Sample not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'sales') {
      const user = await User.findById(req.user.userId);
      if (user && !sample.salesPerson.toLowerCase().includes(user.username.toLowerCase())) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
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

// Get sample statistics
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

// Delete sample (only superadmin)
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

// Get sample status by contact ID
const getSampleStatusByContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    
    const samples = await Sample.find({ contactId })
      .select('sampleId status requestedAt completedAt')
      .sort({ requestedAt: -1 });

    res.json({
      success: true,
      data: samples
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
  uploadSampleFiles, // New function for multiple files
  downloadSampleFile,
  downloadMultipleSampleFiles, // New function for multiple downloads
  getSampleStats,
  deleteSample,
  getSampleStatusByContact
};