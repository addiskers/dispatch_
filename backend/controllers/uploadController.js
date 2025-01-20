const nodemailer = require("nodemailer");
const { generatePresignedUrl } = require("./generatePresignedUrlFile");
const Lead = require("../models/Lead");

exports.sendAllDeliverables = async (req, res) => {
  try {
    const { leadId, projectName, files } = req.body;

    const lead = await Lead.findOne({ leadId, projectName });
    if (!lead) {
      return res.status(404).json({ message: "Lead ID and Project Name do not match" });
    }
    const deliverablesToSend = files ? lead.deliverables.filter(d => files.includes(d)) : lead.deliverables;

    const presignedUrls = [];
    for (const fileKey of deliverablesToSend) {
      const url = await generatePresignedUrl(fileKey);
      presignedUrls.push({ name: fileKey.split('/').pop(), url });
    }

    let linksHtml = `<p>Dear Sir/Ma'am,</p>`;
    linksHtml += `<p>I'm pleased to inform you that we've completed the ${lead.projectName}.</p>`;
    linksHtml += `<p>Attached is the report in links:</p>`;
    presignedUrls.forEach(({ name, url }) => {
      linksHtml += `<p><a href="${url}" target="_blank">${name}</a></p>`;
    });
    linksHtml += `<p>Please review it at your convenience. If you have any questions or need clarification, feel free to reach out.</p>`;
    linksHtml += `<p>We value your feedback and are committed to ensuring the report meets your expectations.</p>`;
    linksHtml += `<p>Thank you for entrusting us with this project.</p>`;

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