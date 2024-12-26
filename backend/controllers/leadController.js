// controllers/leadController.js

const Lead = require("../models/Lead");

/**
 * 1) CREATE LEAD (Sales)
 *    - Allows setting paymentStatus if desired, else defaults to "no"
 */
exports.createLead = async (req, res) => {
  try {
    const { 
      leadId, 
      clientName, 
      clientEmail, 
      projectName, 
      projectDescription,
      paymentStatus // optional; will be "no" if not provided
    } = req.body;

    const newLead = new Lead({
      leadId,
      clientName,
      clientEmail,
      projectName,
      projectDescription,
      paymentStatus,         // new field
      salesUser: req.user.userId, // from JWT (the sales user)
    });

    await newLead.save();
    return res.status(201).json({ 
      message: "Lead created successfully", 
      lead: newLead 
    });
  } catch (error) {
    return res.status(500).json({ 
      message: "Error creating lead", 
      error 
    });
  }
};

/**
 * 2) GET "MY LEADS" (Sales)
 *    - Only fetch leads belonging to the logged-in sales user
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
 * 3) UPDATE PAYMENT STATUS (Sales)
 *    - Expects req.params.leadId
 *    - Expects req.body.paymentStatus = "yes" or "no"
 */
exports.updatePaymentStatus = async (req, res) => {
  try {
    if (req.user.role !== "accounts") {
      return res.status(403).json({ message: "Access denied: Only accounts can update payment status" });
    }

    const { leadId } = req.params;
    const { paymentStatus } = req.body;

    const lead = await Lead.findOne({ leadId });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    lead.paymentStatus = paymentStatus;
    await lead.save();

    res.status(200).json({ message: "Payment status updated", lead });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


/**
 * 4) DELETE LEAD (Sales)
 *    - Removes a lead if owned by this Sales user
 */
exports.deleteLead = async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findOneAndDelete({
      leadId,
      salesUser: req.user.userId,
    });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found or not yours" });
    }

    return res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting lead",
      error,
    });
  }
};

/**
 * 5) GET LEAD LIST FOR UPLOADER
 *    - Shows leadId, projectName, projectDescription, paymentStatus, done
 *    - Hides clientName, clientEmail
 */
exports.getLeadListForUploader = async (req, res) => {
  try {
    const leads = await Lead.find({}, {
      leadId: 1,
      projectName: 1,
      projectDescription: 1,
      paymentStatus: 1,
      done: 1,
      _id: 0
    });
    return res.json(leads);
  } catch (error) {
    return res.status(500).json({ 
      message: "Error fetching lead list", 
      error 
    });
  }
};

/**
 * 6) UPDATE DONE STATUS (Uploader)
 *    - Expects req.params.leadId
 *    - Expects req.body.done = true/false
 */
exports.updateDoneStatus = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { done } = req.body; // boolean true or false

    const lead = await Lead.findOne({ leadId });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    lead.done = done;
    await lead.save();

    return res.json({
      message: `Lead marked as ${done ? "done" : "undone"}`,
      lead,
    });
  } catch (error) {
    return res.status(500).json({ 
      message: "Error updating done status", 
      error 
    });
  }
};


exports.getAllLeads = async (req, res) => {
  try {
    const leads = await Lead.find(); // Fetch all leads
    res.status(200).json(leads);
  } catch (error) {
    console.error("Error fetching all leads:", error);
    res.status(500).json({ message: "Error fetching leads" });
  }
};
