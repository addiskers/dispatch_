const multer = require("multer");
const multerS3 = require("multer-s3-v3");
const s3 = require("../config/s3"); 
const Lead = require("../models/Lead");
const { generatePresignedUrl } = require("./generatePresignedUrlFile");
const nodemailer = require("nodemailer");
const { logActivity } = require("../utils/logger");

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

const uploadResearchRequirements = multer({
    storage: multerS3({
      s3,
      bucket: process.env.S3_BUCKET_NAME,
      key: function (req, file, cb) {
        const uniqueName = `research-requirements/${req.body.leadId}/${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
      },
    }),
  }).fields([{ name: "researchRequirements", maxCount: 10 }]);
  

  exports.uploadContracts = [
    upload,
    async (req, res) => {
      try {
        if (!["sales", "superadmin","accounts"].includes(req.user.role)) {
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

  exports.uploadResearchRequirements = [
    uploadResearchRequirements,
    async (req, res) => {
      try {
        if (!["sales", "superadmin","accounts"].includes(req.user.role)) {
          return res.status(403).json({ message: "Access denied: Only sales and superadmin can upload research requirements." });
        }
  
        const { leadId } = req.body;
        const lead = await Lead.findOne({ leadId });
        if (!lead) {
          return res.status(404).json({ message: "Lead not found." });
        }
  
        if (!Array.isArray(lead.researchRequirements)) {
          lead.researchRequirements = [];
        }
  
        if (req.files?.researchRequirements) {
          req.files.researchRequirements.forEach((file) => {
            lead.researchRequirements.push(file.key);
          });
          await lead.save();
        }
  
        res.status(200).json({
          message: "Research requirements uploaded successfully",
          researchRequirementKeys: req.files.researchRequirements.map((f) => f.key),
        });
      } catch (error) {
        console.error("Error uploading research requirements:", error);
        res.status(500).json({ message: "Research requirements upload failed", error: error.message });
      }
    },
  ];

  exports.sendInvoiceEmail = async (req, res) => {
    try {
      const { leadId, toEmails, ccEmails, files } = req.body;
  
      const lead = await Lead.findOne({ leadId }).populate("salesUser", "email");
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
  
      // Validate inputs
      if (!toEmails || !Array.isArray(toEmails) || toEmails.length === 0) {
        return res.status(400).json({ message: "At least one recipient email is required" });
      }
  
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "At least one invoice file is required" });
      }
  
      const presignedUrls = await Promise.all(
        files.map(async (fileKey) => ({
          name: fileKey.split('/').pop(),
          url: await generatePresignedUrl(fileKey),
        }))
      );
  
      let emailContent = `
        <p>Dear Sir/Ma'am,</p>
        <p>Please find attached the invoice for your reference.</p>
        <p><strong>Download Links:</strong></p>
      `;
  
      presignedUrls.forEach(({ name, url }, index) => {
        emailContent += `<p><a href="${url}" target="_blank">${name}</a></p>`;
      });
  
      emailContent +=  `
        <p>Please feel free to contact us at <a href="mailto:sales@skyquestt.com">sales@skyquestt.com</a> for any query.</p>
        <p>Looking forward to our prolonged business association.</p>
        <p>Thank you for choosing SkyQuest!!!</p>
     <div style="font-family: Calibri, Helvetica, sans-serif; font-size: 12pt; color: rgb(0,0,0);">
      <div>Thanks & Regards,</div>
      <div>Skyquest Technology Group</div>
      <div style="color: rgb(17,85,204);">
          <a href="mailto:dispatch@skyquestt.com" style="color: rgb(17,85,204); text-decoration: underline;">dispatch@skyquestt.com</a>
      </div>
      <div style="text-align: left; line-height: 12.5pt; margin: 0;">
          --------------------------------------------------
      </div>
      <div>SkyQuest Technology Group</div>
      <div style="margin: 10px 0;">
          <img src="https://mcusercontent.com/ff1acdbf609e7dc63da1b9d84/images/f92390a9-810a-0e42-f6c7-4f366cfcf555.png" alt="SkyQuest Logo" style="width: 168px; height: 24px;">
      </div>
      <div style="line-height: 19.669px;">Global Commercialization Experts</div>
      <div style="line-height: 19.669px; margin-top: 6pt;">
          Healthcare| Energy & Infra | Water & Sanitation | Agriculture | Engineering, Info Tech, Nanotech & New Materials
      </div>
      <div style="line-height: 19.669px; margin-top: 6pt;">
          <b>US Office:</b> 1, Apache way, West ford, MA 01886, USA | <b>IN Office:</b> Swati Clover, Shilaj Circle, D 1001-1005, Sardar Patel Ring Rd, Thaltej, Ahmedabad, Gujarat 380054, INDIA
      </div>
      <div style="line-height: 19.669px; margin-top: 6pt;">
          <b>W:</b> <a href="http://www.skyquestt.com/" style="color: rgb(17,85,204); text-decoration: underline;">www.skyquestt.com</a>
      </div>
      <div style="line-height: 19.669px; margin-top: 6pt;">
          <b>Skyquest Technology Group | </b><i>Globally local</i>
      </div>
      <div style="line-height: 19.669px; margin-top: 6pt; font-style: italic;">
          Game Changers, Entrepreneurs, Believers, Innovation Ecosystem Architects, Global Innovation Policy & IP Commercialization Advisory
      </div>
      <div style="line-height: 19.669px; margin-top: 6pt;">
          <span style="font-size: 11pt;">Confidentiality Statement: This message is intended only for the individual or entity to which it is addressed. It may contain privileged, confidential information which is exempt from disclosure under applicable laws. If you are not the intended recipient, please note that you are strictly prohibited from disseminating or distributing this information (other than to the intended recipient) or copying this information. If you have received this communication in error, please notify us immediately by return email</span>
      </div>
      <div style="margin-top: 6pt;">
          <b><i>"The trouble is, you think you have time - Buddha"</i></b>
      </div>
  </div>
    `;
  
      const defaultCcEmails = ["accounts@skyquestt.com"];
      if (lead.salesUser && lead.salesUser.email) {
        defaultCcEmails.push(lead.salesUser.email);
      }  
      const allCcEmails = [...defaultCcEmails];
      if (ccEmails && Array.isArray(ccEmails)) {
        ccEmails.forEach(email => {
          if (!allCcEmails.includes(email)) {
            allCcEmails.push(email);
          }
        });
      }
  
      const transporter = nodemailer.createTransporter({
        host: "smtp-mail.outlook.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.OUTLOOK_DISUSER,
          pass: process.env.OUTLOOK_DISPASS,
        },
      });
  
      const mailOptions = {
        from: process.env.OUTLOOK_DISUSER,
        to: toEmails.join(", "),
        cc: allCcEmails.join(", "),
        subject: `Invoice for ${lead.projectName}`,
        html: emailContent,
      };
  
      await transporter.sendMail(mailOptions);
  
      await logActivity(req.user.userId, "Invoice Sent", {
        leadId,
        sentTo: toEmails,
        cc: allCcEmails,
        files: presignedUrls.map((file) => file.name),
      });
  
      res.status(200).json({ message: "Invoice sent successfully" });
  
    } catch (error) {
      console.error("Error sending invoice:", error);
      res.status(500).json({ message: "Failed to send invoice" });
    }
  };