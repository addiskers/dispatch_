const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema(
  {
    leadId: {
      type: String,
      required: true, // Link the chat to a specific lead
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", ChatSchema);
