const express = require("express");
const router = express.Router();
const onedriveController = require("../controllers/onedriveController");
const authMiddleware = require("../middleware/auth");

router.get("/search", authMiddleware, onedriveController.searchFilesController);
router.get("/download", authMiddleware, onedriveController.downloadFileController);

module.exports = router;
