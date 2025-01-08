const express = require("express");
const router = express.Router();
const { getChatsByLead, sendMessage } = require("../controllers/chatController");
const authMiddleware = require("../middleware/auth");

// Get all chats for a specific lead
router.get("/:leadId", authMiddleware, getChatsByLead);

// Send a new message
router.post("/:leadId", authMiddleware, sendMessage);

module.exports = router;
