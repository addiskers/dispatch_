const Chat = require("../models/Chat");

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
  
      // Use `populate()` directly without `execPopulate`
      const populatedChat = await savedChat.populate("sender", "username role");
  
      res.status(201).json(populatedChat);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Error sending message", error });
    }
  };