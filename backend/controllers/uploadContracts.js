const multer = require("multer");
const multerS3 = require("multer-s3-v3");
const s3 = require("../config/s3"); // AWS S3 configuration
const Lead = require("../models/Lead");

const upload = multer({
    storage: multerS3({
      s3,
      bucket: process.env.S3_BUCKET_NAME,
      key: function (req, file, cb) {
        const uniqueName = `contracts/${req.body.leadId}/${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
      },
    }),
  }).fields([{ name: "contracts", maxCount: 10 }]);
  

  exports.uploadContracts = [
    upload,
    async (req, res) => {
      try {
        if (!["sales", "superadmin"].includes(req.user.role)) {
          return res.status(403).json({ message: "Access denied: Only sales and superadmin can upload contracts." });
        }
  
        const { leadId } = req.body;
        const lead = await Lead.findOne({ leadId });
        if (!lead) {
          return res.status(404).json({ message: "Lead not found." });
        }
  
        if (!Array.isArray(lead.contracts)) {
          lead.contracts = [];
        }
  
        if (req.files?.contracts) {
          req.files.contracts.forEach((file) => {
            lead.contracts.push(file.key);
          });
          await lead.save();
        }
  
        res.status(200).json({
          message: "Contracts uploaded successfully",
          contractKeys: req.files.contracts.map((f) => f.key),
        });
      } catch (error) {
        console.error("Error uploading contracts:", error);
        res.status(500).json({ message: "File upload failed", error: error.message });
      }
    },
  ];
  