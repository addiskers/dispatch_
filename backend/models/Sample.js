// models/Sample.js
const mongoose = require('mongoose');

const sampleSchema = new mongoose.Schema({
  sampleId: {
    type: String,
    required: true,
    unique: true
  },
  contactId: {
    type: String,
    required: true,
    ref: 'Contact'
  },
  reportName: {
    type: String,
    required: true
  },
  querySource: {
    type: String,
    enum: ['SQ', 'GII'],
    default: 'SQ',
    required: true
  },
  reportIndustry: {
    type: String,
    required: true
  },
  salesPerson: {
    type: String,
    required: true
  },
  clientCompany: {
    type: String,
    required: true
  },
  clientDesignation: {
    type: String,
    required: true
  },
  clientDepartment: {
    type: String,
    default: 'Not Specified'
  },
  clientCountry: {
    type: String,
    required: true
  },
  clientRequirement: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['requested', 'in_progress', 'done', 'cancelled'],
    default: 'requested'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: {
    type: Date
  },
  sampleFiles: [{
    filename: String,
    originalName: String,
    fileKey: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: [{
    message: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  tags: [String]
}, {
  timestamps: true
});

// Index for efficient queries
sampleSchema.index({ contactId: 1 });
sampleSchema.index({ status: 1 });
sampleSchema.index({ salesPerson: 1 });
sampleSchema.index({ querySource: 1 });
sampleSchema.index({ requestedAt: -1 });

module.exports = mongoose.model('Sample', sampleSchema);