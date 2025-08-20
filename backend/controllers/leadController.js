const Lead = require("../models/Lead");
const User = require("../models/User");
const Log = require("../models/Log");
const { generatePresignedUrl } = require("../controllers/generatePresignedUrlFile");
const { sendNotificationEmail } = require("../utils/emailService");
const { createOutlookEvent } = require("../utils/outlookService");

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
    const superadminEmails = await User.find({ role: "superadmin" }).select("email");
    const salesUser = await User.findById(req.user.userId);
    const recipients = [...uploaderEmails, ...accountsEmails, salesUser.email,];
    const eventAttendees = [salesUser.email, ...accountsEmails.map(e => e.email), ...superadminEmails.map(e => e.email), ...uploaderEmails.map(e => e.email)];
    const eventAttendeesPay = [salesUser.email, ...accountsEmails.map(e => e.email), ...superadminEmails.map(e => e.email)];
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

    if (deliveryDate) {
      const deliveryISO = new Date(deliveryDate).toISOString(); 
      await createOutlookEvent(
        `Delivery Reminder: ${projectName}`,
        `The delivery for project <strong>${projectName}</strong> is scheduled ${deliveryDate}.`,
        deliveryISO,
        eventAttendees
      );
    }

    if (paymentDate) {
      const paymentISO = new Date(paymentDate).toISOString(); 
      await createOutlookEvent(
        `Payment Reminder: ${projectName}`,
        `Payment for project <strong>${projectName}</strong> is due  ${paymentDate}.`,
        paymentISO,
        eventAttendeesPay
      );
    }
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
    const lead = await Lead.findOne({ leadId }).populate("salesUser", "email");
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
    const salesUserEmail = lead.salesUser ? lead.salesUser.email : null;
    const recipients = [
      ...uploaderEmails.map(user => user.email),
      ...accountsEmails.map(user => user.email),
      salesUserEmail, 
    ].filter(Boolean); 
    const subject = `Payment Status Updated: ${lead.projectName}`;
    const html = `
      <p>Dear Team,</p>
      <p>The payment status for the project <strong>${lead.projectName}</strong> has been updated:</p>
      <ul>
        <li> <strong>Lead ID: </strong> ${lead.leadId}</li>
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
    if (!["superadmin", "accounts"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied: Only accounts or superadmin can update lead status." });
    }
    
    const { leadId } = req.params;
    const { done } = req.body;
    
    const lead = await Lead.findOne({ leadId });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (lead.done === "Dispatched") {
      return res.status(400).json({ message: "Cannot modify status after dispatch." });
    }

    if (lead.done === "Done" && !done) {
      return res.status(400).json({ message: "Cannot mark as undone after marking as done." });
    }

    const oldDoneStatus = lead.done;
    lead.done = done ? "Done" : "Waiting for Approval";
    await lead.save();

    if (done) {
      const uploaderEmails = await User.find({ role: "uploader" }).select("email");
      const accountsEmails = await User.find({ role: "accounts" }).select("email");

      const recipients = [...uploaderEmails.map(u => u.email), ...accountsEmails.map(a => a.email)];
      const subject = `Ready to Dispatch: ${lead.projectName}`;
      const html = `
        <p>Dear Team,</p>
        <p>The dispatch status for the project <strong>${lead.projectName}</strong> has been updated:</p>
        <ul>
          <li><strong>Lead ID:</strong> ${lead.leadId}</li>
          <li><strong>Old Status:</strong> ${oldDoneStatus}</li>
          <li><strong>New Status:</strong> ${lead.done}</li>
        </ul>
        <p>Best regards,<br><strong>In-House Notification System</strong></p>
      `;
      await sendNotificationEmail(recipients, subject, html,false);
    }

    await logActivity(req.user.userId, "updated dispatch status", {
      leadId,
      oldValue: { done: oldDoneStatus },
      newValue: { done: lead.done },
    });

    return res.json({ message: `Lead marked as ${lead.done}`, lead });
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

    const oldLead = await Lead.findOne({ leadId }).lean();
    if (!oldLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    let updatedFields = req.body;

    if (role === "sales") {
      const allowedFields = ["clientName", "clientEmail", "deliveryDate"];
      updatedFields = Object.keys(req.body)
        .filter((key) => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});
    } else if (role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const updatedLead = await Lead.findOneAndUpdate({ leadId }, updatedFields, {
      new: true,
      runValidators: true,
      lean: true,
    });

    if (!updatedLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Extract only modified fields
    const changes = {};
    Object.keys(updatedFields).forEach((key) => {
      if (JSON.stringify(oldLead[key]) !== JSON.stringify(updatedLead[key])) {
        changes[key] = {
          oldValue: oldLead[key] ?? "N/A",
          newValue: updatedLead[key] ?? "N/A",
        };
      }
    });

    if (Object.keys(changes).length > 0) {
      await logActivity(req.user.userId, "Updated Lead", {
        leadId,
        oldValue: Object.fromEntries(
          Object.entries(changes).map(([key, val]) => [key, val.oldValue])
        ),
        newValue: Object.fromEntries(
          Object.entries(changes).map(([key, val]) => [key, val.newValue])
        ),
      });
    }

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

exports.downloadResearchRequirement = async (req, res) => {
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

    if (!lead.researchRequirements.includes(key)) {
      console.log("Key not found in research requirements:", key);
      return res.status(404).json({ message: "Research requirement not found for the specified lead." });
    }
    const url = await generatePresignedUrl(key);
      
    return res.status(200).json({ url });
  } catch (error) {
    console.error("Error generating research requirement download URL:", error.message || error);
    res.status(500).json({ message: "Error generating research requirement download URL.", error: error.message || error });
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