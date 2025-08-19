const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Participant sub-schema
const ParticipantSchema = new Schema({
  id: Number,
  name: String,
  email: String,
  phone: String,
  country: String,
  type: { type: String, enum: ['contact', 'user', 'unknown'] },
  is_user: Boolean,
  bounced: Boolean,
  opened: Boolean,
  clicked: Boolean,
  opened_time: Date,
  clicked_time: Date,
  recipient_id: Number,
  field: { type: String, enum: ['from', 'to', 'cc', 'bcc', 'reply_to'] }
}, { _id: false });

// Attachment sub-schema
const AttachmentSchema = new Schema({
  id: Number,
  name: String,
  size: Number,
  content_type: String,
  download_url: String
}, { _id: false });

// Email Engagement sub-schema
const EmailEngagementSchema = new Schema({
  opened: { type: Boolean, default: false },
  clicked: { type: Boolean, default: false },
  bounced: { type: Boolean, default: false },
  opened_time: Date,
  clicked_time: Date
}, { _id: false });

// Email Message sub-schema
const EmailMessageSchema = new Schema({
  message_index: Number,
  message_id: Number,
  conversation_id: Number,
  timestamp: Date,
  subject: String,
  content: String,
  html_content: String,
  direction: { type: String, enum: ['incoming', 'outgoing'] },
  is_read: Boolean,
  needs_response: { type: Boolean, default: false },
  status: Number,
  sender: {
    name: String,
    email: String,
    is_user: Boolean,
    id: Number,
    type: String
  },
  participants: [ParticipantSchema],
  attachments: [AttachmentSchema],
  engagement: EmailEngagementSchema,
  linked_deals: [Number]
}, { _id: false });

// Call Outcome sub-schema
const CallOutcomeSchema = new Schema({
  id: Number,
  name: String
}, { _id: false });

// Email Thread Stats sub-schema
const EmailThreadStatsSchema = new Schema({
  total_messages: { type: Number, default: 0 },
  incoming_messages: { type: Number, default: 0 },
  outgoing_messages: { type: Number, default: 0 },
  messages_with_attachments: { type: Number, default: 0 },
  total_attachments: { type: Number, default: 0 },
  unique_participants: { type: Number, default: 0 },
  has_unread_messages: { type: Boolean, default: false },
  needs_response: { type: Boolean, default: false }
}, { _id: false });

// Main Conversation schema - stores full conversation data
const ConversationSchema = new Schema({
  _id: Schema.Types.ObjectId,
  
  // Reference to contact
  contact_id: { type: Number, required: true, index: true },
  
  // Conversation identification
  conversation_id: { type: String, required: true },
  type: { type: String, enum: ['phone', 'email_thread', 'note', 'chat'], required: true },
  
  // Phone call fields
  call_id: Number,
  call_recording_url: String,
  call_duration: Number,
  phone_number: String,
  call_direction: { type: String, enum: ['incoming', 'outgoing'] },
  call_status: { type: String, enum: ['incoming', 'outgoing', 'missed', 'voicemail'] },
  outcome: CallOutcomeSchema,
  
  // Email thread fields
  email_id: Number,
  thread_count: Number,
  first_message_date: Date,
  last_message_date: Date,
  stats: EmailThreadStatsSchema,
  messages: [EmailMessageSchema],
  
  // Common fields
  created_at: { type: Date, required: true, index: true },
  updated_at: Date,
  subject: String,
  content: String,
  attachments: [AttachmentSchema],
  participants: [ParticipantSchema],
  user_details: {
    id: Number,
    name: String,
    email: String
  },
  
  // Metadata
  sync_metadata: {
    synced_at: Date,
    last_updated: Date,
    version: { type: Number, default: 1 }
  }
}, { 
  timestamps: true,
  collection: 'conversations'
});

// Indexes for better query performance
ConversationSchema.index({ contact_id: 1, created_at: -1 });
ConversationSchema.index({ contact_id: 1, type: 1 });
ConversationSchema.index({ conversation_id: 1 });
ConversationSchema.index({ 'created_at': -1 });
ConversationSchema.index({ type: 1, created_at: -1 });

// Compound index for efficient contact conversation queries
ConversationSchema.index({ 
  contact_id: 1, 
  type: 1, 
  created_at: -1 
});

// Method to get conversation summary for storage in contact
ConversationSchema.methods.getSummary = function() {
  const summary = {
    conversation_id: this.conversation_id,
    type: this.type,
    subject: this.subject,
    created_at: this.created_at,
    updated_at: this.updated_at || this.created_at,
    participants_count: this.participants ? this.participants.length : 0,
    has_attachments: false,
    attachment_count: 0,
    last_activity: this.updated_at || this.created_at,
    needs_response: false
  };
  
  // Type-specific summary data
  if (this.type === 'email_thread') {
    summary.message_count = this.messages ? this.messages.length : 0;
    summary.has_attachments = this.stats ? this.stats.total_attachments > 0 : false;
    summary.attachment_count = this.stats ? this.stats.total_attachments : 0;
    summary.needs_response = this.stats ? this.stats.needs_response : false;
    summary.last_activity = this.last_message_date || this.created_at;
  } else if (this.type === 'phone') {
    summary.direction = this.call_direction;
    summary.duration = this.call_duration;
    summary.is_connected = this.call_duration > 90; 
  }
  
  return summary;
};

// Static method to get conversations for a contact
ConversationSchema.statics.findByContactId = function(contactId, options = {}) {
  const query = { contact_id: contactId };
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .sort({ created_at: -1 })
    .limit(options.limit || 100);
};

ConversationSchema.statics.getStatsForContact = function(contactId) {
  return this.aggregate([
    { $match: { contact_id: contactId } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        total_messages: {
          $sum: {
            $cond: {
              if: { $eq: ['$type', 'email_thread'] },
              then: { $size: { $ifNull: ['$messages', []] } },
              else: 0
            }
          }
        },
        total_attachments: {
          $sum: {
            $cond: {
              if: { $eq: ['$type', 'email_thread'] },
              then: '$stats.total_attachments',
              else: 0
            }
          }
        },
        last_activity: { $max: '$updated_at' }
      }
    }
  ]);
};

module.exports = mongoose.model('Conversation', ConversationSchema);