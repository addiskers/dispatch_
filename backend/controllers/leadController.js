const Lead = require("../models/Lead");
const User = require("../models/User");
const Log = require("../models/Log");
const { generatePresignedUrl } = require("../controllers/generatePresignedUrlFile");
const { sendNotificationEmail } = require("../utils/emailService");

const logActivity = async (userId, action, details) => {
  try {
    console.log("Logging activity:", { userId, action, details });
    await Log.create({
      user: userId,
      action,
      ...details,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};
/**
 * Create a new lead
 */
exports.createLead = async (req, res) => {
  try {
    const {
      leadType, 
      clientName,
      clientEmail,
      clientCompany,
      projectName,
      projectDescription,
      paymentStatus,
      deliveryDate,
      sqcode,
      paymentDate,
    } = req.body;

    if (!["SQ", "GII", "MK"].includes(leadType)) {
      return res.status(400).json({ message: "Invalid lead type" });
    }

    const parsedClientName = Array.isArray(clientName)
      ? clientName.filter(Boolean)
      : [clientName].filter(Boolean);

    const parsedClientEmail = Array.isArray(clientEmail)
      ? clientEmail.filter(Boolean)
      : [clientEmail].filter(Boolean);

    if (!parsedClientName.length) return res.status(400).json({ message: "At least one client name is required." });
    if (!parsedClientEmail.length) return res.status(400).json({ message: "At least one client email is required." });
    if (!projectName || projectName.trim() === "") {
      return res.status(400).json({ message: "Project name is required." });
    }

    const leadCount = await Lead.countDocuments({});
    const newLeadId = `${leadType}-${leadCount + 1}`;

    const newLead = new Lead({
      leadId: newLeadId,
      leadType,
      clientName: parsedClientName,
      clientEmail: parsedClientEmail,
      clientCompany,
      projectName,
      projectDescription,
      paymentStatus: paymentStatus || "not_received",
      deliveryDate: deliveryDate || null,
      sqcode,
      paymentDate: paymentDate || null,
      salesUser: req.user.userId,
    });

    await newLead.save();

    const uploaderEmails = await User.find({ role: "uploader" }).select("email");
    const accountsEmails = await User.find({ role: "accounts" }).select("email");
    const salesUser = await User.findById(req.user.userId);
    const superadminEmails = await User.find({ role: "superadmin" }).select("email");

    const recipients = [...uploaderEmails, ...accountsEmails, salesUser.email, ...superadminEmails];
    const subject = `New Lead Created: ${projectName}`;
    const html = `
      <p>A new lead has been created:</p>
      <ul>
        <li><strong>Lead ID:</strong> ${newLeadId}</li>
        <li><strong>Project Name:</strong> ${projectName}</li>
        <li><strong>Delivery Date:</strong> ${deliveryDate ? new Date(deliveryDate).toLocaleDateString() : "Not specified"}</li>
        <li>Created By ${salesUser.username}</li>
      </ul>
      <p>Best regards,<br><strong>In-House Notification System</strong></p> 
    `;

    await sendNotificationEmail(recipients, subject, html);

    await logActivity(req.user.userId, "created lead", {
      leadId: newLeadId,
      newValue: {
        clientName: parsedClientName,
        clientEmail: parsedClientEmail,
        clientCompany,
        projectName,
        projectDescription,
        paymentStatus: paymentStatus || "not_received",
        deliveryDate: deliveryDate || null,
        sqcode,
        paymentDate: paymentDate || null,
      },
    });

    res.status(201).json({ message: "Lead created successfully.", lead: newLead });
  } catch (error) {
    console.error("Error creating lead:", error);
    res.status(500).json({ message: "Error creating lead.", error });
  }
};




/**
 * Get leads belonging to the logged-in sales user
 */
exports.getMyLeads = async (req, res) => {
  try {
    const leads = await Lead.find({ salesUser: req.user.userId, deleted: false }).sort({ createdAt: -1 });
    return res.status(200).json(leads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    return res.status(500).json({ message: "Error fetching leads" });
  }
};

/**
 * Update payment status (accounts only)
 */
exports.updatePaymentStatus = async (req, res) => {
  try {
    if (req.user.role !== "accounts") {
      return res.status(403).json({ message: "Access denied: Only accounts can update payment status." });
    }

    const { leadId } = req.params;
    const { paymentStatus, paymentRemark } = req.body;

    const lead = await Lead.findOne({ leadId });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found." });
    }
    const oldStatus = lead.paymentStatus;
    if (
      (oldStatus === "full" && paymentStatus !== "full") ||
      (oldStatus === "partial" && paymentStatus === "not_received")
    ) {
      return res.status(400).json({ message: "Invalid payment status transition." });
    }
    lead.paymentStatus = paymentStatus;
    if (paymentRemark) lead.paymentRemark = paymentRemark;

    await lead.save();
    const uploaderEmails = await User.find({ role: "uploader" }).select("email");
    const accountsEmails = await User.find({ role: "accounts" }).select("email");
    const salesUser = await User.findById(req.user.userId);
    const superadminEmails = await User.find({ role: "superadmin" }).select("email");

    const recipients = [...uploaderEmails, ...accountsEmails, salesUser.email,...superadminEmails];
    const subject = `Payment Status Updated: ${lead.projectName}`;
    const html = `
      <p>Dear Team,</p>
      <p>The payment status for the project <strong>${lead.projectName}</strong> has been updated:</p>
      <ul>
        <li> <strong>Lead id: </strong> ${lead.leadId}</li>
        <li><strong>Old Status:</strong> ${oldStatus}</li>
        <li><strong>New Status:</strong> ${paymentStatus}</li>
      </ul>
      <p>Best regards,<br><strong>In-House Notification System</strong></p>
    `;
    await sendNotificationEmail(recipients, subject, html);
    await logActivity(req.user.userId, "updated payment status", {
      leadId,
      oldValue: { paymentStatus: oldStatus },
      newValue: { paymentStatus },
    });

    return res.status(200).json({ message: "Payment status updated.", lead });
  } catch (error) {
    console.error("Error updating payment status:", error);
    return res.status(500).json({ message: "Error updating payment status.", error });
  }
};

/**
 * Delete a lead (sales only)
 */
exports.deleteLead = async (req, res) => {
  try {
    const { leadId } = req.params;

    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied: Only superadmin can delete leads." });
    }

    const lead = await Lead.findOneAndUpdate(
      { leadId },
      { deleted: true },
      { new: true } 
    );

    if (!lead) {
      return res.status(404).json({ message: "Lead not found." });
    }

    await logActivity(req.user.userId, "deleted lead", { leadId });

    res.status(200).json({ message: "Lead marked as deleted successfully.", lead });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};


/**
 * Get lead list for uploaders
 */
exports.getLeadListForUploader = async (req, res) => {
  try {
    const leads = await Lead.find({ deleted: false }).sort({ createdAt: -1 }); 
    return res.status(200).json(leads);
  } catch (error) {
    console.error("Error fetching leads for uploader:", error);
    return res.status(500).json({ message: "Error fetching leads", error });
  }
};

/**
 * Update done status (uploaders only)
 */
exports.updateDoneStatus = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { done } = req.body;
    
    const lead = await Lead.findOne({ leadId });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    if (lead.done && !done) {
      return res.status(400).json({ message: "Cannot mark as Undone once Done" });
    }
    const oldDoneStatus = lead.done;
    lead.done = done;
    await lead.save();
    await logActivity(req.user.userId, "updated done status", {
      leadId,
      oldValue: { done: oldDoneStatus },
      newValue: { done },
    });
    return res.json({ message: `Lead marked as ${done ? "Done" : "Undone"}`, lead });
  } catch (error) {
    console.error("Error updating done status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get all leads (for accounts or admins)
 */
exports.getAllLeads = async (req, res) => {
  try {
    const leads = await Lead.find({ deleted: false }).sort({ createdAt: -1 }); 
    res.status(200).json(leads);
  } catch (error) {
    console.error("Error fetching all leads:", error);
    res.status(500).json({ message: "Error fetching leads", error });
  }
};



exports.updateLeadById = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { role } = req.user;

    const oldLead = await Lead.findOne({ leadId });
    if (!oldLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (role === "sales") {
      const allowedFields = ["clientName", "clientEmail", "deliveryDate"];
      req.body = Object.keys(req.body)
        .filter((key) => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});
    } else if (role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const updatedLead = await Lead.findOneAndUpdate({ leadId }, req.body, {
      new: true, 
      runValidators: true, 
    });

    if (!updatedLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    await logActivity(req.user.userId, "updated lead", {
      leadId,
      oldValue: oldLead,
      newValue: updatedLead,
    });

    res.status(200).json(updatedLead);
  } catch (error) {
    console.error("Error updating lead details:", error);
    res.status(500).json({ message: "Error updating lead details" });
  }
};

exports.getLeadById = async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findOne({ leadId }).populate("salesUser", "username role");
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (req.user.role === "uploader") {
      lead.clientEmail = undefined;
      lead.clientName = undefined;
    }

    res.status(200).json(lead);
  } catch (error) {
    console.error("Error fetching lead details:", error);
    res.status(500).json({ message: "Error fetching lead details" });
  }
};

exports.downloadContract = async (req, res) => {
    try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({ message: "File key is required." });
    }
    const leadId = key.split("/")[1];
    console.log("Extracted leadId:", leadId);

    const lead = await Lead.findOne({ leadId });
    console.log("Lead query result:", lead);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found." });
    }

    if (!lead.contracts.includes(key)) {
      console.log("Key not found in contracts:", key);
      return res.status(404).json({ message: "Contract not found for the specified lead." });
    }
    const url = await generatePresignedUrl(key);
      
    return res.status(200).json({ url });
  } catch (error) {
    console.error("Error generating download URL:", error.message || error);
    res.status(500).json({ message: "Error generating download URL.", error: error.message || error });
  }
};
exports.getPaymentStatus = async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findOne({ leadId });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({ paymentStatus: lead.paymentStatus });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({ message: "Error fetching payment status", error });
  }
};

exports.getNextLeadId = async (req, res) => {
  try {
    const { leadType } = req.query;

    if (!["SQ", "GII", "MK"].includes(leadType)) {
      return res.status(400).json({ message: "Invalid lead type" });
    }
    const leadCount = await Lead.countDocuments({});
    const nextLeadId = `${leadType}-${leadCount + 1}`;
    res.json({ nextLeadId });
  } catch (error) {
    console.error("Error fetching next Lead ID:", error);
    res.status(500).json({ message: "Error fetching next Lead ID" });
  }
};
