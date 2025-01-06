const Lead = require("../models/Lead");
const logActivity = async (userId, action, details) => {
  await User.findByIdAndUpdate(userId, {
    $push: { activityLogs: { action, details } },
  });
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
      return res.status(403).json({ message: "Access denied: Only accounts can update payment status" });
    }

    const { leadId } = req.params;
    const { paymentStatus, paymentRemark } = req.body;

    if (!["full", "partial", "not_received"].includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status value" });
    }

    const lead = await Lead.findOne({ leadId });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Restrict payment status transitions
    if (
      (lead.paymentStatus === "full" && paymentStatus !== "full") ||
      (lead.paymentStatus === "partial" && paymentStatus === "not_received")
    ) {
      return res.status(400).json({ message: "Invalid payment status transition" });
    }

    lead.paymentStatus = paymentStatus;
    if (paymentRemark) {
      lead.paymentRemark = paymentRemark; 
    }

    await lead.save();

    return res.status(200).json({ message: "Payment status updated", lead });
  } catch (error) {
    console.error("Error updating payment status:", error);
    return res.status(500).json({ message: "Internal server error" });
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
