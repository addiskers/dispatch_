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
 * @param {boolean} includeCc - Whether to include the CC email.
 */
const sendNotificationEmail = async (recipients, subject, html, includeCc = true) => {
  try {
    const mailOptions = {
      from: '"In-House Notifications" <matt@theskyquestt.org>',
      to: recipients.join(", "),
      subject,
      html,
    };

    if (includeCc) {
      mailOptions.cc = "sd@skyquestt.com";
    }

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending notification email:", error);
  }
};

module.exports = { sendNotificationEmail };
