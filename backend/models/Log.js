const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference the User model
      required: true,
    },
    action: { type: String, required: true }, // e.g., "deleted lead", "login"
    leadId: { type: String, default: null }, // Optional: Track specific lead actions
    oldValue: mongoose.Schema.Types.Mixed, // Old value before change
    newValue: mongoose.Schema.Types.Mixed, // New value after change
    timestamp: { type: Date, default: Date.now }, // Timestamp of the action
  },
  { timestamps: true }
);

module.exports = mongoose.model("Log", LogSchema);
