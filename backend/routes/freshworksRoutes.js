const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getLeadsFromFreshworks,
  getLeadConversations,
  getEmailThreadDetails,
  getCompanySummary,
  getCallTranscription
} = require("../controllers/freshworksController");

router.get("/leads", auth, getLeadsFromFreshworks);
router.get("/leads/:leadId/conversations", auth, getLeadConversations);
router.get("/emails/:emailId", auth, getEmailThreadDetails);
router.get("/company-summary", auth, getCompanySummary);
router.post("/call-transcript", auth, getCallTranscription);

module.exports = router;