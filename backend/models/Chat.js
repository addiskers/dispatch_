const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema(
  {
    leadId: {
      type: String,
      required: true, 
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
