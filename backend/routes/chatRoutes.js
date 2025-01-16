const express = require("express");
const router = express.Router();
const { getChatsByLead, sendMessage } = require("../controllers/chatController");
const authMiddleware = require("../middleware/auth");

router.get("/:leadId", authMiddleware, getChatsByLead);
router.post("/:leadId", authMiddleware, sendMessage);

module.exports = router;
