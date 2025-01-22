const nodemailer = require("nodemailer");
const { generatePresignedUrl } = require("./generatePresignedUrlFile");
const Lead = require("../models/Lead");
const User = require("../models/User");
const { sendNotificationEmail } = require("../utils/emailService");
const { logActivity } = require("../utils/logger");

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
      to: lead.clientEmail,
      subject: `Your Deliverables for ${lead.projectName}`,
      html: linksHtml,
    };

    await transporter.sendMail(mailOptions);
    const uploaderEmails = await User.find({ role: "uploader" }).select("email");
    const accountsEmails = await User.find({ role: "accounts" }).select("email");
    const salesUser = await User.findById(lead.salesUser);
    const superadminEmails = await User.find({ role: "superadmin" }).select("email");

    const recipients = [
      ...uploaderEmails.map(user => user.email),
      ...accountsEmails.map(user => user.email),
      ...superadminEmails.map(user => user.email),
      salesUser.email,
    ];

    const subject = `Report Dispatched: ${lead.projectName}`;
    const html = `
      <p>Dear Team,</p>
      <p>The report for the project <strong>${lead.projectName}</strong> has been successfully dispatched.</p>
      <ul>
        <li><strong>Lead ID:</strong> ${lead.leadId}</li>
        <li><strong>Dispatched At:</strong> ${new Date().toLocaleString()}</li>
        <li><strong>Delivery Date:</strong> ${lead.deliveryDate ? new Date(lead.deliveryDate).toLocaleDateString() : "Not specified"}</li>
      </ul>
      <p>Best regards,<br><strong>In-House Notification System</strong></p>
    `;

    await sendNotificationEmail(recipients, subject, html);
    await logActivity(req.user.userId, "Report Dispatched", {
      leadId,
      newValue: {
      projectName: lead.projectName,
      dispatchedFiles: presignedUrls.map((file) => file.name), 
      }
    });
    return res.json({
      message: "Deliverables sent to client",
      fileCount: presignedUrls.length,
    });
  } catch (error) {
    console.error("Error sending deliverables:", error);
    return res.status(500).json({ error: "Error sending deliverables" });
  }
};