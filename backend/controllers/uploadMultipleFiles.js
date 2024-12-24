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
  // This allows up to, say, 10 files at once
  upload.array("deliverables", 10),
  async (req, res) => {
    try {
      const { leadId } = req.body;

      // The uploaded files info is in req.files (an array)
      // each req.files[i] has .key, .location, etc.
      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ message: "No files received for upload" });
      }

      // 2) Find the lead in MongoDB
      const lead = await Lead.findOne({ leadId });
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // 3) For each uploaded file, push the S3 key into lead.deliverables
      req.files.forEach((file) => {
        lead.deliverables.push(file.key); // file.key is "deliverables/12345-abc.pdf"
      });

      // 4) Save the lead
      await lead.save();

      // 5) Respond with success
      return res.json({
        message: "Files uploaded successfully",
        keys: req.files.map((f) => f.key), // or f.location
      });
    } catch (error) {
      console.error("Error uploading multiple files:", error);
      return res.status(500).json({ error: "File upload failed" });
    }
  },
];
