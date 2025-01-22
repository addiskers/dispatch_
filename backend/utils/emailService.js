const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com",
  port: 587,
  secure: false, 
  auth: {
    user: process.env.OUTLOOK_USER,
    pass: process.env.OUTLOOK_PASS,
  },
});

/**
 * Send a notification email.
 * @param {string[]} recipients - Array of email addresses.
 * @param {string} subject - Email subject.
 * @param {string} html - Email HTML content.
 */
const sendNotificationEmail = async (recipients, subject, html) => {
  try {
    await transporter.sendMail({
      from: '"In-House Notifications" <matt@theskyquestt.org>',
      to: recipients.join(", "),
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending notification email:", error);
  }
};

module.exports = { sendNotificationEmail };
