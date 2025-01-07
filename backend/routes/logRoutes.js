const express = require("express");
const router = express.Router();
const { getFilteredLogs } = require("../controllers/superAdminController");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware, getFilteredLogs);

module.exports = router;
