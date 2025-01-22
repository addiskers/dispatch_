const Chat = require("../models/Chat");
const { logActivity } = require("../utils/logger");
const User = require("../models/User");
const { sendNotificationEmail } = require("../utils/emailService");

exports.getChatsByLead = async (req, res) => {
  try {
    const { leadId } = req.params;

    const chats = await Chat.find({ leadId }).populate("sender", "username role");
    res.status(200).json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ message: "Error fetching chats", error });
  }
};

exports.sendMessage = async (req, res) => {
    try {
      const { leadId } = req.params;
      const { message } = req.body;
  
      if (!message || message.trim() === "") {
        return res.status(400).json({ message: "Message cannot be empty" });
      }
  
      const newChat = new Chat({
        leadId,
        sender: req.user.userId,
        message,
       
      });
      
      const savedChat = await newChat.save();
      const sender = await User.findById(req.user.userId, "username");
      const populatedChat = await savedChat.populate("sender", "username role");
      await logActivity(req.user.userId, `${sender.username} sent message`, {
        leadId,
        newValue: { message },
      });
      const uploaderEmails = await User.find({ role: "uploader" }).select("email");
      const accountsEmails = await User.find({ role: "accounts" }).select("email");
      const salesUser = await User.findById(populatedChat.sender._id); 

      const recipients = [
        ...uploaderEmails.map(user => user.email),
        ...accountsEmails.map(user => user.email),
        ...superadminEmails.map(user => user.email),
        salesUser.email,
      ];

      const subject = `New Chat Message for Lead ID: ${leadId}`;
      const html = `
        <p>Dear Team,</p>
        <p>A new chat message has been sent for Lead ID: <strong>${leadId}</strong>.</p>
        <ul>
          <li><strong>Sender:</strong> ${sender.username}</li>
          <li><strong>Message:</strong> ${message}</li>
        </ul>
        <p>Best regards,<br><strong>In-House Notification System</strong></p>
      `;

      await sendNotificationEmail(recipients, subject, html);
        res.status(201).json(populatedChat);
      } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Error sending message", error });
      }
    };