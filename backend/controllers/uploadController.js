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
     if (lead.done !== "Done" && lead.done !== "Dispatched") {
      return res.status(400).json({ message: "Lead is not ready for dispatch." });
    }
    const deliverablesToSend = files ? lead.deliverables.filter(d => files.includes(d)) : lead.deliverables;

    const presignedUrls = [];
    for (const fileKey of deliverablesToSend) {
      const url = await generatePresignedUrl(fileKey);
      presignedUrls.push({ name: fileKey.split('/').pop(), url });
    }
    let linksHtml = `
    <p>Dear Sir/Ma'am,</p>
    <p>Greetings from team SkyQuest!!!</p>
    <p>We are glad to be associated with you, please allow me to deliver the final report as agreed.</p>
    <p><strong>Download Link(s):</strong></p>
  `;
  presignedUrls.forEach(({ url }, index) => {
    linksHtml += `<p><a href="${url}" target="_blank">Download Link ${index + 1}</a></p>`;
  });

  linksHtml += `
      <p>Please feel free to contact us at <a href="mailto:sales@skyquestt.com">sales@skyquestt.com</a> for any post-delivery feedback.</p>
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
  `

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
      cc: "sd@skyquestt.com",
      subject: `Final Report_${lead.projectName}`,
      html: linksHtml,
    };

    await transporter.sendMail(mailOptions);
    lead.done = "Dispatched";
    await lead.save();
    const uploaderEmails = await User.find({ role: "uploader" }).select("email");
    const accountsEmails = await User.find({ role: "accounts" }).select("email");
    const salesUser = await User.findById(lead.salesUser);
    const superadminEmails = await User.find({ role: "superadmin" }).select("email");

    const recipients = [
      ...uploaderEmails.map(user => user.email),
      ...accountsEmails.map(user => user.email),
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
