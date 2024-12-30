const Lead = require("../models/Lead");

/**
 * Create a new lead
 */
exports.createLead = async (req, res) => {
  try {
    const { leadId, clientName, clientEmail, projectName, projectDescription, paymentStatus } = req.body;

    // Check if leadId already exists
    const existingLead = await Lead.findOne({ leadId });
    if (existingLead) {
      return res.status(400).json({ message: "Lead ID already exists" });
    }

    const newLead = new Lead({
      leadId,
      clientName,
      clientEmail,
      projectName,
      projectDescription,
      paymentStatus: paymentStatus || "no",
      salesUser: req.user.userId,
    });

    await newLead.save();
    return res.status(201).json({ message: "Lead created successfully", lead: newLead });
  } catch (error) {
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
    return res.status(500).json({ message: "Error fetching leads", error });
  }
};

/**
 * Update payment status (accounts only)
 */
exports.updatePaymentStatus = async (req, res) => {
  try {
    if (req.user.role !== "accounts") {
      return res.status(403).json({ message: "Access denied: Only accounts can update payment status" });
    }

    const { leadId } = req.params;
    const { paymentStatus } = req.body;

    if (!["yes", "no"].includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status value" });
    }

    const lead = await Lead.findOneAndUpdate({ leadId }, { paymentStatus }, { new: true });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({ message: "Payment status updated", lead });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ message: "Internal server error" });
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
    const leads = await Lead.find({ sentToResearcher: true });
    console.log("Filtered Leads:", leads); 
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

    if (typeof done !== "boolean") {
      return res.status(400).json({ message: "Invalid done status" });
    }

    const lead = await Lead.findOneAndUpdate({ leadId }, { done }, { new: true });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({ message: `Lead marked as ${done ? "done" : "undone"}`, lead });
  } catch (error) {
    console.error("Error updating done status:", error);
    res.status(500).json({ message: "Internal server error" });
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

/**
 * Send lead to researcher (sales only)
 */
exports.sendToResearcher = async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findOneAndUpdate({ leadId, salesUser: req.user.userId }, { sentToResearcher: true }, { new: true });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found or not owned by you" });
    }

    res.status(200).json({ message: "Lead sent to researcher", lead });
  } catch (error) {
    console.error("Error sending lead to researcher:", error);
    res.status(500).json({ message: "Server error" });
  }
};
