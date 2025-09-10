const mongoose = require('mongoose');

const sampleFileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileKey: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const requirementFileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileKey: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const noteSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const sampleSchema = new mongoose.Schema({
  sampleId: {
    type: String,
    required: true,
    unique: true
  },
  contactId: {
    type: String,
    required: true
  },
  reportName: {
    type: String,
    required: true
  },
  querySource: {
    type: String,
    enum: ['SQ', 'GII'],
    default: 'SQ'
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
  salesRequirement: {
    type: String,
    required: false,
    default: ""
  },
  contactRequirement: {
    type: String,
    default: null
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // New allocation fields
  allocatedTo: {
    type: String,
    default: null
  },
  qcedBy: {
    type: String,
    default: null
  },
  allocatedAt: {
    type: Date,
    default: null
  },
  allocatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['requested', 'in_progress', 'done', 'cancelled', 'allocated'],
    default: 'requested'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    default: null
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  tags: [{
    type: String
  }],
  sampleFiles: [sampleFileSchema],
  requirementFiles: [requirementFileSchema],
  notes: [noteSchema]
}, {
  timestamps: true
});

sampleSchema.virtual('totalFilesCount').get(function() {
  return (this.sampleFiles ? this.sampleFiles.length : 0) + 
         (this.requirementFiles ? this.requirementFiles.length : 0);
});

sampleSchema.virtual('ageInDays').get(function() {
  return Math.floor((new Date() - this.requestedAt) / (1000 * 60 * 60 * 24));
});

sampleSchema.methods.isOverdue = function() {
  if (!this.dueDate) return false;
  return new Date() > this.dueDate && this.status !== 'done' && this.status !== 'cancelled';
};

sampleSchema.methods.getTimeToCompletion = function() {
  if (!this.completedAt) return null;
  
  const timeDiff = this.completedAt - this.requestedAt;
  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    hours,
    minutes,
    formatted: `${hours}h ${minutes}m`
  };
};

sampleSchema.statics.findByStatus = function(status) {
  return this.find({ status });
};

sampleSchema.statics.findOverdue = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $nin: ['done', 'cancelled'] }
  });
};

sampleSchema.pre('save', function(next) {
  if (this.sampleFiles && this.sampleFiles.length > 0 && this.status === 'requested') {
    this.status = 'in_progress';
  }
  next();
});

sampleSchema.set('toJSON', { virtuals: true });
sampleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Sample', sampleSchema);