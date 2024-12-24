// models/Lead.js
const mongoose = require("mongoose");

const LeadSchema = new mongoose.Schema({
  leadId: { type: String, required: true, unique: true },
  clientName: { type: String, required: true },
  clientEmail: { type: String, required: true },
  projectName: { type: String },
  projectDescription: { type: String },
  salesUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Existing fields, e.g. paymentStatus, done, etc. if you have them
  paymentStatus: {
    type: String,
    enum: ["yes", "no"],
    default: "no",
  },
  done: {
    type: Boolean,
    default: false,
  },

  // NEW: Store an array of S3 file keys
  deliverables: {
    type: [String], // array of strings, each string is the file's key on S3
    default: [],
  },
});

module.exports = mongoose.model("Lead", LeadSchema);
