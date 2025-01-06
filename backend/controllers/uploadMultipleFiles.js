// controllers/uploadController.js
const multer = require("multer");
const multerS3 = require("multer-s3-v3");
const s3 = require("../config/s3"); // Your AWS v3 S3 client
const Lead = require("../models/Lead");

// 1) Configure multer-s3-v3 for multiple files
//    "deliverables" is the name of the form field in your front end
const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME,
    // no ACL if your bucket has ACLs disabled
    key: function (req, file, cb) {
      const uniqueName = `deliverables/${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    },
  }),
});

exports.uploadMultipleFiles = [
  upload.array("deliverables", 10),
  async (req, res) => {
    try {
      const { leadId, projectName } = req.body;

      // Validate leadId and projectName (case-sensitive)
      const lead = await Lead.findOne({ leadId, projectName });
      if (!lead) {
        return res.status(404).json({ message: "Lead ID and Project Name do not match" });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files received for upload" });
      }

      // Add uploaded files to lead deliverables
      req.files.forEach((file) => {
        lead.deliverables.push(file.key);
      });

      await lead.save();

      return res.json({
        message: "Files uploaded successfully",
        keys: req.files.map((f) => f.key),
      });
    } catch (error) {
      console.error("Error uploading multiple files:", error);
      return res.status(500).json({ error: "File upload failed" });
    }
  },
];

