const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["sales", "uploader"], required: true },
  // In a real app, you'd store hashed passwords and possibly emails, etc.
});

module.exports = mongoose.model("User", UserSchema);
