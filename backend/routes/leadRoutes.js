const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const leadController = require("../controllers/leadController");
const { getLeadById, updateLeadById, downloadContract } = require("../controllers/leadController");
const { uploadContracts } = require("../controllers/uploadContracts");

router.get("/download-contract", authMiddleware, downloadContract);

// --- SALES endpoints ---
router.post("/", authMiddleware, leadController.createLead);
router.get("/my-leads", authMiddleware, leadController.getMyLeads);
router.patch("/:leadId/payment-status", authMiddleware, leadController.updatePaymentStatus);
router.delete("/:leadId", authMiddleware, leadController.deleteLead);
router.get("/:leadId/paymentstatus", authMiddleware, leadController.getPaymentStatus); 
router.get("/next-lead-id", authMiddleware, leadController.getNextLeadId);

// --- UPLOADER endpoints ---
router.get("/uploader/list", authMiddleware, leadController.getLeadListForUploader);
router.patch("/:leadId/done", authMiddleware, leadController.updateDoneStatus);

// --- ACCOUNTS endpoints ---
router.get("/accounts/all-leads", authMiddleware, leadController.getAllLeads);
router.get("/:leadId", authMiddleware, getLeadById);
router.patch("/:leadId", authMiddleware, updateLeadById);
router.post("/upload-contracts", authMiddleware, uploadContracts);

module.exports = router;