const Lead = require("../models/Lead");
const User = require("../models/User");
const Log = require("../models/Log");

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
    console.log("Request Body:", req.body);
    const { leadId, clientName, clientEmail,clientCompany,projectName, projectDescription, paymentStatus, deliveryDate, sqcode } = req.body;

    // Validation
    if (!clientName || clientName.length === 0) {
      return res.status(400).json({ message: "At least one client name is required." });
    }
    if (!clientEmail || clientEmail.length === 0) {
      return res.status(400).json({ message: "At least one client email is required." });
    }

    // Check for duplicate leadId
    const existingLead = await Lead.findOne({ leadId });
    if (existingLead) {
      return res.status(400).json({ message: "Lead ID already exists" });
    }

    // Create new lead
    const newLead = new Lead({
      leadId,
      clientName,
      clientEmail,
      clientCompany,
      projectName,
      projectDescription,
      paymentStatus: paymentStatus || "not_received",
      deliveryDate: deliveryDate || null,
      sqcode,
      salesUser: req.user.userId,
    });

    await newLead.save();
    logActivity(req.user.userId, " lead", { leadId, changes });
    return res.status(201).json({ message: "Lead created successfully", lead: newLead });
  } catch (error) {
    console.error("Error creating lead:", error);
    return res.status(500).json({ message: "Error creating lead", error });
  }
};



/**
 * Get leads belonging to the logged-in sales user
 */
exports.getMyLeads = async (req, res) => {
  try {
    const leads = await Lead.find({ salesUser: req.user.userId });
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

    // Fetch the old payment status
    const oldStatus = lead.paymentStatus;

    // Restrict invalid payment status transitions
    if (
      (oldStatus === "full" && paymentStatus !== "full") ||
      (oldStatus === "partial" && paymentStatus === "not_received")
    ) {
      return res.status(400).json({ message: "Invalid payment status transition." });
    }

    // Update payment status
    lead.paymentStatus = paymentStatus;
    if (paymentRemark) lead.paymentRemark = paymentRemark;

    await lead.save();

    // Log activity
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

    const lead = await Lead.findOneAndDelete({ leadId, salesUser: req.user.userId });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found or not owned by you" });
    }
    await logActivity(req.user.userId, "deleted lead", { leadId });
    res.status(200).json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get lead list for uploaders
 */
exports.getLeadListForUploader = async (req, res) => {
  try {
    const leads = await Lead.find(); // Fetch all leads
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
    const leads = await Lead.find();
    res.status(200).json(leads);
  } catch (error) {
    console.error("Error fetching all leads:", error);
    res.status(500).json({ message: "Error fetching leads", error });
  }
};
