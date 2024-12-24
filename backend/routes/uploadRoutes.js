// routes/uploadRoutes.js
const express = require("express");
const router = express.Router();
const { uploadMultipleFiles } = require("../controllers/uploadMultipleFiles");
const authMiddleware = require("../middleware/auth"); 
const { sendAllDeliverables } = require("../controllers/uploadController");

// POST /api/upload/multiple
router.post("/multiple", authMiddleware, uploadMultipleFiles);
router.post("/send", authMiddleware, sendAllDeliverables);

module.exports = router;
