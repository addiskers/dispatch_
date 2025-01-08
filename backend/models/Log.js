const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: { type: String, required: true }, 
    leadId: { type: String, default: null }, 
    oldValue: mongoose.Schema.Types.Mixed, 
    newValue: mongoose.Schema.Types.Mixed, 
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Log", LogSchema);
