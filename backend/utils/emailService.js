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
 * @param {boolean} includeCc - Whether to include the default CC email.
 * @param {string[]} customCcList - Custom CC email addresses array.
 */
const sendNotificationEmail = async (recipients, subject, html, includeCc = true, customCcList = []) => {
  try {
    const mailOptions = {
      from: '"Dispatch Notification" <matt@theskyquestt.org>',
      to: recipients.join(", "),
      subject,
      html,
    };

    let ccEmails = [];
    
    if (includeCc) {
      ccEmails.push("sd@skyquestt.com");
    }
    
    if (customCcList && Array.isArray(customCcList)) {
      ccEmails = [...ccEmails, ...customCcList];
    }
    
    if (ccEmails.length > 0) {
      const uniqueCcEmails = [...new Set(ccEmails)];
      mailOptions.cc = uniqueCcEmails.join(", ");
    }

    console.log('Sending email with options:', {
      to: mailOptions.to,
      cc: mailOptions.cc,
      subject: mailOptions.subject
    });

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error("Error sending notification email:", error);
    throw error; 
  }
};

module.exports = { sendNotificationEmail };