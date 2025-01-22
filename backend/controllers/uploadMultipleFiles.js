// controllers/uploadController.js
const multer = require("multer");
const multerS3 = require("multer-s3-v3");
const s3 = require("../config/s3"); 
const Lead = require("../models/Lead");

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME,
    key: function (req, file, cb) {
      const uniqueName = `deliverables/${req.body.leadId}/${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    },
  }),
});

exports.uploadMultipleFiles = [
  upload.array("deliverables", 10), 
  async (req, res) => {
    try {
      if (!["uploader", "superadmin"].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied: Only uploader and superadmin can upload deliverables." });
      }

      const { leadId, projectName } = req.body;

      const lead = await Lead.findOne({ leadId, projectName });
      if (!lead) {
        return res.status(404).json({ message: "Lead ID and Project Name do not match." });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files received for upload." });
      }

      if (!Array.isArray(lead.deliverables)) {
        lead.deliverables = [];
      }

      req.files.forEach((file) => {
        lead.deliverables.push(file.key);
      });

      await lead.save();

      res.status(200).json({
        message: "Files uploaded successfully.",
        keys: req.files.map((file) => file.key),
      });
    } catch (error) {
      console.error("Error uploading multiple files:", error);
      res.status(500).json({ error: "File upload failed." });
    }
  },
];
