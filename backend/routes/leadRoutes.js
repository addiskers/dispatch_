// routes/leadRoutes.js

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const leadController = require("../controllers/leadController");

// --- SALES endpoints ---
router.post("/", authMiddleware, leadController.createLead);
router.get("/my-leads", authMiddleware, leadController.getMyLeads);
router.patch("/:leadId/payment-status", authMiddleware, leadController.updatePaymentStatus);
router.delete("/:leadId", authMiddleware, leadController.deleteLead);

// --- UPLOADER endpoints ---
router.get("/uploader/list", authMiddleware, leadController.getLeadListForUploader);
router.patch("/:leadId/done", authMiddleware, leadController.updateDoneStatus);


router.get("/accounts/all-leads", authMiddleware, leadController.getAllLeads);
router.patch("/:leadId/send-to-researcher", authMiddleware, leadController.sendToResearcher);

module.exports = router;
