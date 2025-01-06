const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["sales", "uploader", "accounts", "superadmin"], required: true },
  activityLogs: [
    {
      action: String, // e.g., 'updated password'
      timestamp: { type: Date, default: Date.now },
      details: mongoose.Schema.Types.Mixed, // Optional details
    },
  ],
});

module.exports = mongoose.model("User", UserSchema);
