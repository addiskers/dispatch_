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

// Conversation sub-schema
const ConversationSchema = new Schema({
  id: String,
  type: { type: String, enum: ['phone', 'email_thread', 'note', 'chat'] },
  
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
  created_at: Date,
  updated_at: Date,
  subject: String,
  content: String,
  attachments: [AttachmentSchema],
  participants: [ParticipantSchema],
  user_details: {
    id: Number,
    name: String,
    email: String
  }
}, { _id: false });

// Conversation Stats sub-schema
const ConversationStatsSchema = new Schema({
  total_conversations: { type: Number, default: 0 },
  email_threads: { type: Number, default: 0 },
  total_email_messages: { type: Number, default: 0 },
  phone_calls: { type: Number, default: 0 },
  notes: { type: Number, default: 0 },
  last_conversation_date: Number,
  email_stats: {
    threads_with_replies: { type: Number, default: 0 },
    average_messages_per_thread: String,
    longest_thread: { type: Number, default: 0 },
    total_attachments: { type: Number, default: 0 },
    needs_response: { type: Boolean, default: false }
  }
}, { _id: false });

// Custom Fields sub-schema
const CustomFieldSchema = new Schema({
  cf_company_name: String,
  cf_contact_established: String,
  cf_ip_address: String,
  cf_region: String,
  cf_lead_level: String,
  cf_contact_category: String,
  cf_follow_up: String,
  cf_comments: String,
  cf_usercompany_linkedin: String,
  cf_custom_tags: String,
  cf_company_linkedin: String,
  cf_employee_size: String,
  cf_un: String,
  cf_product_name: String,
  cf_product_id: String,
  cf_report_name: String,
  cf_deal_amount_in_usd: Number,
  cf_why: String,
  cf_company_domain: String,
  cf_cf_research_requirement: String,
  cf_call_follow_ups: String,
  cf_email_follow_ups: String,
  cf_top_3_competitors: String,
  cf_relevant_reports: String,
  cf_research_requirement: String,
  cf_copy_data: Boolean,
  cf_name: String,
  cf_lead_category: String,
  cf_modified_created_at: Date,
  cf_research_requirements: String,
  cf_your_research_requirements: String,
  cf_industry: String,
  cf_sub_industry: String
}, { _id: false, strict: false }); // strict: false allows additional fields

// Email/Phone item sub-schema
const ContactItemSchema = new Schema({
  id: Number,
  value: String,
  is_primary: Boolean,
  label: String,
  _destroy: Boolean
}, { _id: false });

// Links sub-schema
const LinksSchema = new Schema({
  conversations: String,
  timeline_feeds: String,
  document_associations: String,
  notes: String,
  tasks: String,
  appointments: String,
  reminders: String,
  duplicates: String,
  connections: String
}, { _id: false });

// Field update sub-schema
const FieldUpdateSchema = new Schema({
  syncTime: Date,
  updatedAt: Date,
  changes: Schema.Types.Mixed
}, { _id: false });

// Main Contact schema
const ContactSchema = new Schema({
  _id: Schema.Types.ObjectId,
  id: { type: Number, required: true, unique: true, index: true },
  
  // Basic Information
  display_name: { type: String, required: true, index: true },
  first_name: String,
  last_name: String,
  job_title: String,
  avatar: String,
  
  // Contact Information
  email: { type: String, index: true },
  emails: [ContactItemSchema],
  mobile_number: { type: String, index: true },
  work_number: String,
  phone_numbers: [ContactItemSchema],
  
  // Location Information
  address: String,
  city: String,
  state: String,
  country: String,
  zipcode: String,
  time_zone: String,
  locale: String,
  
  // Company Information
  company: String,
  
  // Status and Ownership
  contact_status_id: Number,
  status_name: { type: String, index: true },
  owner_id: Number,
  owner_name: { type: String, index: true },
  team_user_ids: [Number],
  
  // Sales Information
  lead_score: { type: Number, default: 0 },
  customer_fit: Number,
  active_sales_sequences: String,
  completed_sales_sequences: String,
  
  // Deal Information
  open_deals_count: { type: Number, default: 0 },
  open_deals_amount: String,
  won_deals_count: { type: Number, default: 0 },
  won_deals_amount: String,
  
  // Activity Information
  last_contacted: Date,
  last_contacted_mode: String,
  last_contacted_sales_activity_mode: String,
  last_contacted_via_sales_activity: Date,
  last_assigned_at: Date,
  recent_note: String,
  
  // Campaign Information
  first_campaign: String,
  first_medium: String,
  first_source: String,
  last_campaign: String,
  last_medium: String,
  last_source: String,
  latest_campaign: String,
  latest_medium: String,
  latest_source: String,
  keyword: String,
  medium: String,
  
  // Subscription Information
  subscription_status: Number,
  subscription_types: String,
  sms_subscription_status: Number,
  whatsapp_subscription_status: Number,
  amb_subscription_status: String,
  unsubscription_reason: String,
  other_unsubscription_reason: String,
  
  // Social Media
  linkedin: String,
  facebook: String,
  twitter: String,
  
  // System Information
  external_id: String,
  mcr_id: String,
  is_deleted: { type: Boolean, default: false },
  description: String,
  
  // Tracking Information
  first_seen_chat: Date,
  last_seen: Date,
  last_seen_chat: Date,
  total_sessions: Number,
  web_form_ids: [String],
  
  // Tags
  tags: [String],
  system_tags: [String],
  
  // Timestamps
  created_at: { type: Date, index: true },
  updated_at: Date,
  lastUpdatedAt: Date,
  syncedAt: Date,
  
  // Related Data
  conversations: [ConversationSchema],
  conversation_stats: ConversationStatsSchema,
  custom_field: CustomFieldSchema,
  links: LinksSchema,
  fieldUpdates: [FieldUpdateSchema]
}, { 
  timestamps: true,
  collection: 'contacts'
});

// Indexes for better query performance
ContactSchema.index({ 'conversations.type': 1 });
ContactSchema.index({ 'conversations.created_at': -1 });
ContactSchema.index({ 'custom_field.cf_company_name': 1 });
ContactSchema.index({ 'custom_field.cf_region': 1 });
ContactSchema.index({ lead_score: -1 });
ContactSchema.index({ created_at: -1, status_name: 1 });
ContactSchema.index({ owner_name: 1, status_name: 1 });

// Virtual for full name
ContactSchema.virtual('full_name').get(function() {
  return [this.first_name, this.last_name].filter(Boolean).join(' ') || this.display_name;
});

// Method to get conversation summary
ContactSchema.methods.getConversationSummary = function() {
  const summary = {
    total: this.conversations.length,
    phone_calls: 0,
    email_threads: 0,
    last_interaction: null
  };
  
  this.conversations.forEach(conv => {
    if (conv.type === 'phone') summary.phone_calls++;
    if (conv.type === 'email_thread') summary.email_threads++;
    
    if (!summary.last_interaction || conv.created_at > summary.last_interaction) {
      summary.last_interaction = conv.created_at;
    }
  });
  
  return summary;
};

// Static method to get contacts by owner
ContactSchema.statics.findByOwner = function(ownerName, options = {}) {
  return this.find({ owner_name: ownerName }, null, options);
};

module.exports = mongoose.model('Contact', ContactSchema);