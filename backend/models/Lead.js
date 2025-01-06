const mongoose = require("mongoose");

const LeadSchema = new mongoose.Schema(
  {
    leadId: { type: String, required: true, unique: true },
    clientName: { type: [String], required: true },
    clientEmail: { type: [String], required: true },
    clientCompany: { type: String, required: true },
    projectName: { type: String, required: true },
    projectDescription: { type: String, default: "" },
    salesUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["full", "partial", "not_received"],
      default: "not_received",
    },
    paymentRemark: {
      type: String,
      default: "",
    },
    done: {
      type: Boolean,
      default: false,
    },
    deliverables: {
      type: [String],
      default: [],
    },
    sqcode: {
      type: String,
      default: "", 
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    deliveryDate: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true } 
);



module.exports = mongoose.model("Lead", LeadSchema);
