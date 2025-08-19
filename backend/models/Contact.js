const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConversationSummarySchema = new Schema({
  conversation_id: String,
  type: { type: String, enum: ['phone', 'email_thread', 'note', 'chat'] },
  subject: String,
  created_at: Date,
  updated_at: Date,
  message_count: { type: Number, default: 1 },
  has_attachments: { type: Boolean, default: false },
  attachment_count: { type: Number, default: 0 },
  last_activity: Date,
  participants_count: { type: Number, default: 0 },
  direction: String, 
  duration: Number, 
  is_connected: Boolean, 
  needs_response: { type: Boolean, default: false }
}, { _id: false });

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
}, { _id: false, strict: false });

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

// CRM Analytics Schema for storing calculated analytics
const CRMAnalyticsSchema = new Schema({
  first_contact: {
    date: String,
    type: String,
    direction: String,
    user_id: Number,
    user_name: String,
    user_email: String
  },
  first_call: {
    date: String,
    direction: String,
    duration: Number,
    is_connected: Boolean,
    outcome: String,
    user_id: Number,
    user_name: String,
    user_email: String
  },
  first_email_sent: {
    date: String,
    subject: String,
    is_automated: Boolean,
    has_attachment: Boolean,
    user_id: Number,
    user_name: String,
    user_email: String
  },
  first_email_received: {
    date: String,
    subject: String
  },
  last_email_received: {
    date: String,
    subject: String
  },
  first_email_with_attachment: {
    date: String,
    subject: String,
    attachment_count: Number,
    user_id: Number,
    user_name: String,
    user_email: String
  },
  last_contact: {
    date: String,
    type: String,
    direction: String,
    user_id: Number,
    user_name: String,
    user_email: String
  },
  user_activities: Schema.Types.Mixed,
  primary_user: {
    user_id: Number,
    user_name: String,
    user_email: String,
    total_activities: Number
  },
  total_users_involved: Number,
  engagement: {
    total_touchpoints: { type: Number, default: 0 },
    outgoing_emails: { type: Number, default: 0 },
    incoming_emails: { type: Number, default: 0 },
    outgoing_calls: { type: Number, default: 0 },
    incoming_calls: { type: Number, default: 0 },
    connected_calls: { type: Number, default: 0 },
    not_connected_calls: { type: Number, default: 0 },
    email_opens: { type: Number, default: 0 },
    email_clicks: { type: Number, default: 0 },
    email_replies: { type: Number, default: 0 },
    call_answers: { type: Number, default: 0 },
    call_duration_total: { type: Number, default: 0 },
    connected_call_duration_total: { type: Number, default: 0 },
    avg_call_duration: { type: Number, default: 0 },
    avg_connected_call_duration: { type: Number, default: 0 }
  },
  response_metrics: {
    first_response_time: String,
    avg_response_time: String,
    last_response_date: String,
    response_rate: { type: Number, default: 0 },
    needs_follow_up: { type: Boolean, default: true }
  },
  lead_progression: {
    days_in_pipeline: Number,
    status_changes: [Schema.Types.Mixed],
    qualification_score: { type: Number, default: 0 },
    next_action_due: String,
    last_action_date: String
  },
  contact_frequency: {
    last_7_days: { type: Number, default: 0 },
    last_30_days: { type: Number, default: 0 },
    last_90_days: { type: Number, default: 0 },
    avg_contacts_per_week: { type: Number, default: 0 }
  },
  meetings: {
    scheduled: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    no_shows: { type: Number, default: 0 },
    next_meeting: String
  }
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
  
  // Related Data - CHANGED: Only summaries, not full conversations
  conversation_summaries: [ConversationSummarySchema], // Lightweight summaries
  conversation_stats: ConversationStatsSchema,
  crm_analytics: CRMAnalyticsSchema, 
  custom_field: CustomFieldSchema,
  links: LinksSchema,
  fieldUpdates: [FieldUpdateSchema]
}, { 
  timestamps: true,
  collection: 'contacts'
});

// Indexes for better query performance
ContactSchema.index({ 'conversation_summaries.type': 1 });
ContactSchema.index({ 'conversation_summaries.created_at': -1 });
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
    total: this.conversation_summaries.length,
    phone_calls: 0,
    email_threads: 0,
    last_interaction: null
  };
  
  this.conversation_summaries.forEach(conv => {
    if (conv.type === 'phone') summary.phone_calls++;
    if (conv.type === 'email_thread') summary.email_threads++;
    
    if (!summary.last_interaction || conv.created_at > summary.last_interaction) {
      summary.last_interaction = conv.created_at;
    }
  });
  
  return summary;
};

ContactSchema.statics.findByOwner = function(ownerName, options = {}) {
  return this.find({ owner_name: ownerName }, null, options);
};

module.exports = mongoose.model('Contact', ContactSchema);