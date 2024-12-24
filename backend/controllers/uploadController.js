// controllers/uploadController.js
const nodemailer = require("nodemailer");
const { generatePresignedUrl } = require("./generatePresignedUrlFile");
const Lead = require("../models/Lead");

exports.sendAllDeliverables = async (req, res) => {
  try {
    const { leadId } = req.body;

    // 1) Find the lead
    const lead = await Lead.findOne({ leadId });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // 2) For each fileKey in lead.deliverables, generate a presigned URL
    const presignedUrls = [];
    for (const fileKey of lead.deliverables) {
      const url = await generatePresignedUrl(fileKey);
      presignedUrls.push(url);
    }

    // 3) Build an email body with all the links
    let linksHtml = `<p>Here are your deliverables:</p>`;
    presignedUrls.forEach((url, index) => {
      linksHtml += `<p>File #${index + 1}: <a href="${url}">${url}</a></p>`;
    });

    // 4) Send email to the client using nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: lead.clientEmail,
      subject: `Your Deliverables for ${lead.projectName}`,
      html: linksHtml,
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      message: "Deliverables sent to client",
      fileCount: presignedUrls.length,
    });
  } catch (error) {
    console.error("Error sending deliverables:", error);
    return res.status(500).json({ error: "Error sending deliverables" });
  }
};
