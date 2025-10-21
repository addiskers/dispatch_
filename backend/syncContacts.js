require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');
const { calculateCRMAnalytics } = require('./crmAnalytics');

const {
  MONGO_URI,
  FRESHWORKS_API_KEY,
  FRESHWORKS_API_KEY_2,
  FRESHWORKS_BASE_URL
} = process.env;

if (!FRESHWORKS_API_KEY || !FRESHWORKS_BASE_URL) {
  console.error('Missing required environment variables: FRESHWORKS_API_KEY, FRESHWORKS_BASE_URL');
  process.exit(1);
}

const API_KEYS = [
  FRESHWORKS_API_KEY,
  FRESHWORKS_API_KEY_2,
].filter(key => key && key.trim() !== ''); 

let currentKeyIndex = 0;
let apiCallCount = 0;
const MAX_CALLS_PER_KEY = 1900; 
const RATE_LIMIT_RESET_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

// Add sync state tracking
let isSyncRunning = false;
let lastSyncStartTime = null;
let lastSyncEndTime = null;
let syncAttempts = 0;

console.log(`Initialized with ${API_KEYS.length} API keys for rate limiting`);
const IGNORED_EMAIL_DOMAINS = ['skyquestt.com', 'gii.co.jp','freshchat.com'];

/**
 * Get current API headers with automatic key rotation
 */
function getAPIHeaders() {
  const currentKey = API_KEYS[currentKeyIndex];
  return {
    "Authorization": `Token token=${currentKey}`,
    "Content-Type": "application/json",
    "Accept": "*/*"
  };
}

/**
 * Rotate to next API key when rate limit is approached
 */
function rotateAPIKey() {
  const oldIndex = currentKeyIndex;
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  apiCallCount = 0;
  
  if (currentKeyIndex === 0 && oldIndex > 0) {
    console.log('Cycled through all API keys. Waiting 60 seconds before continuing...');
    return new Promise(resolve => setTimeout(resolve, 60000));
  }
  
  return Promise.resolve();
}

/**
 * Make API request with automatic rate limiting and key rotation
 */
/**
 * Make API request with automatic rate limiting, key rotation, and retry logic
 */
async function makeAPIRequest(url, options = {}, retries = 3) {
  if (apiCallCount >= MAX_CALLS_PER_KEY) {
    await rotateAPIKey();
  }
  
  const headers = getAPIHeaders();
  const requestOptions = {
    ...options,
    headers: { ...headers, ...options.headers },
    validateStatus: status => status < 500,
    timeout: 30000  
  };
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      apiCallCount++;
      const response = await axios.get(url, requestOptions);
      
      // Check for rate limit response
      if (response.status === 429 || 
          (response.data && typeof response.data === 'string' && response.data.includes('Rate limit'))) {
        console.log(`⚠️ Rate limit hit on API key ${currentKeyIndex + 1}. Rotating...`);
        await rotateAPIKey();
        
        const newHeaders = getAPIHeaders();
        apiCallCount++;
        return await axios.get(url, { ...requestOptions, headers: newHeaders });
      }
      
      return response;
      
    } catch (error) {
      const isLastAttempt = attempt === retries;
      
      // Handle socket/network errors with retry
      if (error.code === 'ECONNRESET' || 
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNABORTED' ||
          error.message.includes('socket hang up') ||
          error.message.includes('timeout')) {
        
        if (!isLastAttempt) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`⚠️ Network error (${error.message}). Retrying in ${waitTime/1000}s... (Attempt ${attempt + 1}/${retries + 1})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      // Handle rate limit errors
      if (error.response && error.response.status === 429) {
        console.log(`⚠️ Rate limit error on API key ${currentKeyIndex + 1}. Rotating...`);
        await rotateAPIKey();
        
        if (!isLastAttempt) {
          const newHeaders = getAPIHeaders();
          apiCallCount++;
          return await axios.get(url, { ...requestOptions, headers: newHeaders });
        }
      }
      
      // If last attempt, throw the error
      if (isLastAttempt) {
        console.error(`❌ Failed after ${retries + 1} attempts:`, error.message);
        throw error;
      }
    }
  }
}

/**
 * Check if contact has a valid market name (cf_report_name)
 */
function hasValidMarketName(contact) {
  const marketName = contact.custom_field?.cf_report_name;
  
  // Check if market name exists and is not empty/invalid
  if (!marketName || 
      marketName === null || 
      marketName === undefined || 
      marketName === '' || 
      marketName === '-' ||
      marketName === 'NA' ||
      marketName === 'na' ||
      marketName === 'N/A' ||
      marketName === 'n/a') {
    return false;
  }
  
  return true;
}

/**
 * Check if contact should be ignored based on email domains
 */
function shouldIgnoreContact(contact) {
  const emailsToCheck = [];
  
  // Add primary email
  if (contact.email) emailsToCheck.push(contact.email);
  
  // Add emails from emails array
  if (contact.emails && Array.isArray(contact.emails)) {
    contact.emails.forEach(emailObj => {
      const email = emailObj.value || emailObj.email || emailObj;
      if (email && typeof email === 'string') {
        emailsToCheck.push(email);
      }
    });
  }
  
  return emailsToCheck.some(email => 
    IGNORED_EMAIL_DOMAINS.some(domain => 
      email.toLowerCase().includes(domain.toLowerCase())
    )
  );
}

/**
 * Main contact validation - combines all ignore conditions
 */
function shouldSkipContact(contact) {
  if (shouldIgnoreContact(contact)) {
    return { skip: true, reason: 'ignored_email_domain' };
  }
  
  // Check market name
  if (!hasValidMarketName(contact)) {
    return { skip: true, reason: 'invalid_market_name' };
  }
  
  return { skip: false, reason: null };
}

/**
 * Detect changes between old and new contact data
 */
function detectFieldChanges(oldContact, newContact) {
  const changes = {};
  const fieldsToTrack = [
    'display_name', 'email', 'job_title', 'country', 
    'work_number', 'mobile_number', 'lead_score', 
    'last_contacted', 'last_contacted_mode', 'recent_note', 
    'owner_id', 'owner_name', 'contact_status_id', 'status_name',
    'territory_id', 'territory_name'
  ];
  
  // Check basic fields
  fieldsToTrack.forEach(field => {
    if (oldContact[field] !== newContact[field]) {
      changes[field] = {
        from: oldContact[field],
        to: newContact[field]
      };
    }
  });
  
  // Check custom fields
  if (oldContact.custom_field && newContact.custom_field) {
    const customChanges = {};
    Object.keys(newContact.custom_field).forEach(key => {
      if (oldContact.custom_field[key] !== newContact.custom_field[key]) {
        customChanges[key] = {
          from: oldContact.custom_field[key],
          to: newContact.custom_field[key]
        };
      }
    });
    
    if (Object.keys(customChanges).length > 0) {
      changes.custom_field = customChanges;
    }
  }
  
  // Check arrays (emails, phone_numbers, tags)
  const arrayFields = ['emails', 'phone_numbers', 'tags'];
  arrayFields.forEach(field => {
    if (JSON.stringify(oldContact[field]) !== JSON.stringify(newContact[field])) {
      changes[field] = {
        from: oldContact[field],
        to: newContact[field]
      };
    }
  });
  
  return changes;
}

/**
 * Find owner name by ID from users array
 */
function findOwnerName(ownerId, users) {
  if (!ownerId || !users) return null;
  const owner = users.find(user => user.id === ownerId);
  return owner ? owner.display_name : null;
}

/**
 * Find status name by ID from contact statuses array
 */
function findStatusName(statusId, contactStatuses) {
  if (!statusId || !contactStatuses) return null;
  const status = contactStatuses.find(status => status.id === statusId);
  return status ? status.name : null;
}

/**
 * Find territory name by ID from territories array
 */
function findTerritoryName(territoryId, territories) {
  if (!territoryId || !territories) return null;
  const territory = territories.find(territory => territory.id === territoryId);
  return territory ? territory.name : null;
}

/**
 * Fetch conversations for a specific contact
 */
async function fetchContactConversations(contactId, contactName = null) {
  try {
    const nameInfo = contactName ? ` (${contactName})` : '';
    console.log(`     Fetching conversations for contact ${contactId}${nameInfo}... [API Key ${currentKeyIndex + 1}]`);
    
    const apiUrl = `${FRESHWORKS_BASE_URL}/contacts/${contactId}/conversations/all` +
                   `?include=email_conversation_recipients,targetable,phone_number,phone_caller,note,user&per_page=100`;
    
    const response = await makeAPIRequest(apiUrl);
    
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html') || 
        (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>'))) {
      console.log(`     Authentication issue when fetching conversations for ${contactId}${nameInfo}`);
      return null;
    }

    if (!response.data || !response.data.conversations) {
      console.log(`     No conversations found for contact ${contactId}${nameInfo}`);
      return [];
    }

    console.log(`     Found ${response.data.conversations.length} conversations for ${contactId}${nameInfo}`);
    return response.data;
  } catch (error) {
    const nameInfo = contactName ? ` (${contactName})` : '';
    console.error(`     Error fetching conversations for contact ${contactId}${nameInfo}:`, error.message);
    return null;
  }
}

/**
 * Fetch complete email thread for a specific email ID
 */
async function fetchCompleteEmailThread(emailId, contactName = null) {
  try {
    const nameInfo = contactName ? ` (${contactName})` : '';
    console.log(`     Fetching complete email thread for ${emailId}${nameInfo}... [API Key ${currentKeyIndex + 1}]`);
    
    let allEmailConversations = [];
    let allEmailRecipients = [];
    let allUsers = [];
    let allContacts = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const apiUrl = `${FRESHWORKS_BASE_URL}/emails/${emailId}` +
                     `?include=email_conversation_recipients,attachments,targetable&page=${page}`;
      
      const response = await makeAPIRequest(apiUrl);
      
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('text/html') || 
          (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>'))) {
        console.log(`     Authentication issue when fetching email thread ${emailId}${nameInfo}`);
        return null;
      }

      if (!response.data || !response.data.email_conversations || response.data.email_conversations.length === 0) {
        hasMore = false;
        break;
      }

      const emailConversations = response.data.email_conversations || [];
      allEmailConversations.push(...emailConversations);
      
      if (response.data.email_conversation_recipients) {
        allEmailRecipients.push(...response.data.email_conversation_recipients);
      }
      if (response.data.users) {
        allUsers.push(...response.data.users);
      }
      if (response.data.contacts) {
        allContacts.push(...response.data.contacts);
      }
      
      console.log(`  Page ${page}: Found ${emailConversations.length} email conversations`);
      page++;
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`     Total email conversations found for ${emailId}${nameInfo}: ${allEmailConversations.length}`);
    
    return {
      email_conversations: allEmailConversations,
      email_conversation_recipients: allEmailRecipients,
      users: allUsers,
      contacts: allContacts
    };
    
  } catch (error) {
    const nameInfo = contactName ? ` (${contactName})` : '';
    console.error(`     Error fetching email thread ${emailId}${nameInfo}:`, error.message);
    return null;
  }
}

/**
 * Process complete email thread into single thread with all messages
 */
function processEmailThread(emailThreadData, emailId) {
  if (!emailThreadData || !emailThreadData.email_conversations) {
    return null;
  }

  const { 
    email_conversations, 
    email_conversation_recipients, 
    users, 
    contacts 
  } = emailThreadData;

  const sortedMessages = email_conversations.sort((a, b) => 
    new Date(a.conversation_time) - new Date(b.conversation_time)
  );

  const messages = [];

  sortedMessages.forEach((emailConv, index) => {
    const emailRecipientIds = emailConv.email_conversation_recipient_ids || [];
    const relevantRecipients = email_conversation_recipients.filter(er => 
      emailRecipientIds.includes(er.id)
    );

    const participants = relevantRecipients.map(recipient => {
      let participantDetails = {};
      if (recipient.is_user) {
        const user = users.find(u => u.email === recipient.email_address);
        participantDetails = {
          id: user ? user.id : null,
          name: user ? user.display_name : recipient.email_name,
          type: 'user'
        };
      } else {
        const contact = contacts.find(c => c.email === recipient.email_address);
        participantDetails = {
          id: contact ? contact.id : null,
          name: contact ? contact.display_name : recipient.email_name,
          type: 'contact'
        };
      }

      return {
        recipient_id: recipient.id,
        field: recipient.field, 
        email: recipient.email_address,
        name: recipient.email_name,
        is_user: recipient.is_user,
        bounced: recipient.bounced,
        opened: recipient.opened,
        clicked: recipient.clicked,
        opened_time: recipient.opened_time,
        clicked_time: recipient.clicked_time,
        ...participantDetails
      };
    });

    const sender = participants.find(p => p.field === 'from') || {};

    const attachments = (emailConv.attachments || []).map(att => ({
      id: att.id,
      name: att.content_file_name,
      size: att.content_file_size,
      content_type: att.content_content_type,
      download_url: att.content_path
    }));

    const message = {
      message_index: index,
      message_id: emailConv.id,
      conversation_id: emailConv.id,
      timestamp: emailConv.conversation_time,
      subject: emailConv.subject,
      content: emailConv.display_content,
      html_content: emailConv.html_content,
      direction: emailConv.direction,
      is_read: emailConv.is_read,
      needs_response: emailConv.needs_response,
      status: emailConv.status,
      
      sender: {
        name: sender.name || 'Unknown',
        email: sender.email || '',
        is_user: sender.is_user || false,
        id: sender.id || null,
        type: sender.type || 'unknown'
      },
      
      participants: participants,
      attachments: attachments,
      
      engagement: {
        opened: participants.some(p => p.opened),
        clicked: participants.some(p => p.clicked),
        bounced: participants.some(p => p.bounced),
        opened_time: participants.find(p => p.opened_time)?.opened_time || null,
        clicked_time: participants.find(p => p.clicked_time)?.clicked_time || null
      },
      
      linked_deals: emailConv.linked_deals || []
    };

    messages.push(message);
  });

  const emailThread = {
    id: `email-thread-${emailId}`,
    type: 'email_thread',
    email_id: emailId,
    thread_count: messages.length,
    
    subject: messages[0]?.subject || 'No Subject',
    first_message_date: messages[0]?.timestamp || null,
    last_message_date: messages[messages.length - 1]?.timestamp || null,
    
    stats: {
      total_messages: messages.length,
      incoming_messages: messages.filter(m => m.direction === 'incoming').length,
      outgoing_messages: messages.filter(m => m.direction === 'outgoing').length,
      messages_with_attachments: messages.filter(m => m.attachments.length > 0).length,
      total_attachments: messages.reduce((sum, m) => sum + m.attachments.length, 0),
      unique_participants: [...new Set(messages.flatMap(m => m.participants.map(p => p.email)))].length,
      has_unread_messages: messages.some(m => !m.is_read),
      needs_response: messages.some(m => m.needs_response)
    },
    
    messages: messages
  };

  return emailThread;
}

/**
 * Enhanced conversation processing with full email threads
 */
async function processConversationDataEnhanced(conversationsResponse, contactName) {
  const processedConversations = [];
  
  const { 
    conversations = [], 
    email_conversations = [],
    phone_calls = [], 
    phone_numbers = [], 
    phone_callers = [], 
    notes = [], 
    users = [],
    outcomes = []
  } = conversationsResponse;
  
  console.log(`       Processing ${conversations.length} conversations for ${contactName}`);
  
  // Group conversations by email_id to get unique threads
  const emailThreads = new Map();
  
  for (const conversation of conversations) {
    const [conversationType, actualIdStr] = conversation.id.split('-');
    const actualId = parseInt(actualIdStr);
    
    if (conversationType === 'email') {
      const emailConv = email_conversations.find(ec => ec.id === conversation.targetable?.id);
      if (emailConv && emailConv.email_id) {
        if (!emailThreads.has(emailConv.email_id)) {
          emailThreads.set(emailConv.email_id, {
            email_id: emailConv.email_id,
            count: emailConv.count || 1,
            latest_time: emailConv.conversation_time
          });
        }
      }
    } else if (conversationType === 'phone') {
      const processedConv = {
        id: conversation.id,
        type: 'phone',
        call_id: actualId,
        created_at: null,
        updated_at: null,
        subject: 'Phone Call',
        content: null,
        attachments: [],
        participants: [],
        call_recording_url: null,
        call_duration: null,
        phone_number: null,
        call_direction: null,
        call_status: null,
        outcome: null,
        user_details: null
      };
      
      const phoneCall = phone_calls.find(pc => pc.id === actualId);
      if (phoneCall) {
        processedConv.created_at = phoneCall.conversation_time;
        processedConv.updated_at = phoneCall.conversation_time;
        processedConv.call_duration = phoneCall.call_duration;
        processedConv.call_recording_url = phoneCall.recording;
        processedConv.call_direction = phoneCall.call_direction ? 'incoming' : 'outgoing';
        processedConv.call_status = phoneCall.status;
        processedConv.content = `${processedConv.call_direction} call - Duration: ${phoneCall.call_duration}s`;
        
        if (phoneCall.phone_caller_id) {
          const phoneCaller = phone_callers.find(pc => pc.id === phoneCall.phone_caller_id);
          if (phoneCaller) {
            processedConv.phone_number = phoneCaller.number;
            processedConv.participants.push({
              id: phoneCaller.id,
              name: phoneCaller.name || 'Unknown',
              phone: phoneCaller.number,
              country: phoneCaller.country,
              type: 'contact'
            });
          }
        }
        
        if (phoneCall.user_id) {
          const user = users.find(u => u.id === phoneCall.user_id);
          if (user) {
            processedConv.user_details = {
              id: user.id,
              name: user.display_name,
              email: user.email
            };
            processedConv.participants.push({
              id: user.id,
              name: user.display_name,
              email: user.email,
              type: 'user'
            });
          }
        }
        
        // Get outcome if available
        if (phoneCall.outcome_id) {
          const outcome = outcomes.find(o => o.id === phoneCall.outcome_id);
          if (outcome) {
            processedConv.outcome = {
              id: outcome.id,
              name: outcome.name
            };
            processedConv.content += ` - Outcome: ${outcome.name}`;
          }
        }
        
        // Additional call details
        processedConv.call_details = {
          freshcaller_id: phoneCall.freshcaller_id,
          freshcaller_number: phoneCall.freshcaller_number,
          freshcaller_number_country: phoneCall.freshcaller_number_country,
          cost: phoneCall.cost,
          is_manual: phoneCall.is_manual,
          recording_duration: phoneCall.recording_duration
        };
      }
      
      processedConversations.push(processedConv);
      
    } else if (conversationType === 'note') {
      const processedConv = {
        id: conversation.id,
        type: 'note',
        created_at: null,
        updated_at: null,
        subject: 'Note',
        content: null,
        attachments: [],
        participants: []
      };
      
      const note = notes.find(n => n.id === actualId);
      if (note) {
        processedConv.content = note.description || note.content;
        processedConv.subject = note.title || 'Note';
        processedConv.created_at = note.created_at;
        processedConv.updated_at = note.updated_at;
        
        if (note.creater_id) {
          const user = users.find(u => u.id === note.creater_id);
          if (user) {
            processedConv.participants.push({
              name: user.display_name,
              email: user.email,
              type: 'creator'
            });
          }
        }
      }
      
      processedConversations.push(processedConv);
    }
  }

  for (const [emailId, threadInfo] of emailThreads) {
    console.log(`       Fetching complete thread for email ${emailId} (${threadInfo.count} messages)`);
    
    const emailThreadData = await fetchCompleteEmailThread(emailId, contactName);
    if (emailThreadData) {
      const emailThread = processEmailThread(emailThreadData, emailId);
      if (emailThread) {
        processedConversations.push(emailThread);
        console.log(`       Processed email thread ${emailId} with ${emailThread.messages.length} messages`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`       Successfully processed ${processedConversations.length} total conversations for ${contactName}`);
  return processedConversations;
}

/**
 * Store conversations in separate collection and return summaries
 */
async function storeConversationsAndGetSummaries(contactId, conversations, db) {
  const conversationsCol = db.collection('conversations');
  const summaries = [];
  
  await conversationsCol.deleteMany({ contact_id: contactId });
  
  for (const conversation of conversations) {
    try {
      const conversationDoc = {
        contact_id: contactId,
        conversation_id: conversation.id,
        type: conversation.type,
        created_at: new Date(conversation.created_at || Date.now()),
        updated_at: new Date(conversation.updated_at || conversation.created_at || Date.now()),
        subject: conversation.subject,
        content: conversation.content,
        attachments: conversation.attachments || [],
        participants: conversation.participants || [],
        sync_metadata: {
          synced_at: new Date(),
          last_updated: new Date(),
          version: 1
        }
      };
      
      if (conversation.type === 'email_thread') {
        conversationDoc.email_id = conversation.email_id;
        conversationDoc.thread_count = conversation.thread_count;
        conversationDoc.first_message_date = conversation.first_message_date ? new Date(conversation.first_message_date) : null;
        conversationDoc.last_message_date = conversation.last_message_date ? new Date(conversation.last_message_date) : null;
        conversationDoc.stats = conversation.stats;
        conversationDoc.messages = conversation.messages;
      } else if (conversation.type === 'phone') {
        conversationDoc.call_id = conversation.call_id;
        conversationDoc.call_recording_url = conversation.call_recording_url;
        conversationDoc.call_duration = conversation.call_duration;
        conversationDoc.phone_number = conversation.phone_number;
        conversationDoc.call_direction = conversation.call_direction;
        conversationDoc.call_status = conversation.call_status;
        conversationDoc.outcome = conversation.outcome;
        conversationDoc.user_details = conversation.user_details;
      }
      await conversationsCol.insertOne(conversationDoc);
      
      const summary = {
        conversation_id: conversation.id,
        type: conversation.type,
        subject: conversation.subject,
        created_at: conversationDoc.created_at,
        updated_at: conversationDoc.updated_at,
        participants_count: conversation.participants ? conversation.participants.length : 0,
        has_attachments: false,
        attachment_count: 0,
        last_activity: conversationDoc.updated_at,
        needs_response: false
      };
      
      if (conversation.type === 'email_thread') {
        summary.message_count = conversation.messages ? conversation.messages.length : 0;
        summary.has_attachments = conversation.stats ? conversation.stats.total_attachments > 0 : false;
        summary.attachment_count = conversation.stats ? conversation.stats.total_attachments : 0;
        summary.needs_response = conversation.stats ? conversation.stats.needs_response : false;
        summary.last_activity = conversation.last_message_date ? new Date(conversation.last_message_date) : conversationDoc.created_at;
      } else if (conversation.type === 'phone') {
        summary.direction = conversation.call_direction;
        summary.duration = conversation.call_duration;
        summary.is_connected = conversation.call_duration > 90; // Connected if > 90 seconds
      }
      
      summaries.push(summary);
      
    } catch (error) {
      console.error(`Error storing conversation ${conversation.id} for contact ${contactId}:`, error.message);
    }
  }
  
  return summaries;
}

/**
 * Store sync run status in database
 */
async function updateSyncRunStatus(db, status, details = {}) {
  const stateCol = db.collection('sync_state');
  
  const updateData = {
    sync_status: status,
    last_status_update: new Date(),
    ...details
  };
  
  if (status === 'running') {
    updateData.sync_start_time = new Date();
    updateData.process_id = process.pid;
  } else if (status === 'completed' || status === 'failed') {
    updateData.sync_end_time = new Date();
    if (details.sync_start_time) {
      updateData.sync_duration_ms = new Date() - details.sync_start_time;
    }
  }
  
  await stateCol.updateOne(
    { _id: 'contacts_sync' },
    { $set: updateData },
    { upsert: true }
  );
}

/**
 * Check if sync is currently running
 */
async function isSyncCurrentlyRunning() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    const stateCol = db.collection('sync_state');
    
    const state = await stateCol.findOne({ _id: 'contacts_sync' });
    
    if (!state || !state.sync_status) {
      return false;
    }
    
    if (state.sync_status === 'running') {
      const lastUpdate = new Date(state.last_status_update || state.sync_start_time);
      const fortyFiveMinutesAgo = new Date(Date.now() - 45 * 60 * 1000);
      
      if (lastUpdate < fortyFiveMinutesAgo) {
        console.log('🔄 Found stale running sync status, clearing it...');
        await stateCol.updateOne(
          { _id: 'contacts_sync' },
          { $set: { sync_status: 'stale', last_status_update: new Date() } }
        );
        return false;
      }
      
      return true;
    }
    
    return false;
  } finally {
    await client.close();
  }
}

/**
 * Main sync function - syncs contacts from Freshworks to MongoDB
 */
async function syncContacts() {
  // Check if sync is already running
  if (isSyncRunning) {
    console.log('⚠️ Sync is already running in this process. Skipping...');
    return false;
  }
  
  const isRunningInDB = await isSyncCurrentlyRunning();
  if (isRunningInDB) {
    console.log('⚠️ Sync is already running in another process. Skipping...');
    return false;
  }
  
  const client = new MongoClient(MONGO_URI);
  isSyncRunning = true;
  lastSyncStartTime = new Date();
  syncAttempts++;
  
  try {
    await client.connect();
    const db = client.db();
    const contactsCol = db.collection('contacts');
    const conversationsCol = db.collection('conversations');
    const stateCol = db.collection('sync_state');

    // Mark sync as running
    await updateSyncRunStatus(db, 'running', { 
      sync_start_time: lastSyncStartTime,
      sync_attempt: syncAttempts 
    });

    console.log(`Starting sync #${syncAttempts} at ${lastSyncStartTime.toLocaleString()}`);

    const state = await stateCol.findOne({ _id: 'contacts_sync' });
    let lastSync = state ? state.lastSyncAt : "2020-01-01T00:00:00+05:30";
    const isFirstRun = !state;
    
    console.log(isFirstRun ? 'First run - getting ALL contacts' : `Continuing sync from: ${lastSync}`);
    console.log(`Starting sync with API Key ${currentKeyIndex + 1}/${API_KEYS.length}`);

    let page = 1;
    let keepGoing = true;
    let totalProcessed = 0;
    let newRecords = 0;
    let updatedRecords = 0;
    let recordsWithChanges = 0;
    let conversationsProcessed = 0;
    let ignoredByEmailDomain = 0;
    let ignoredByMarketName = 0;
    let newestContactSeen = lastSync;

    // Process contacts page by page
    while (keepGoing) {
      console.log(`Processing page ${page}... [API Key ${currentKeyIndex + 1}, Calls: ${apiCallCount}/${MAX_CALLS_PER_KEY}]`);
      
      const url = `${FRESHWORKS_BASE_URL}/api/contacts/view/402001974783` +
                  `?per_page=100&page=${page}` +
                  `&sort=updated_at&sort_type=desc&include=owner,contact_status,territory`;

      const response = await makeAPIRequest(url);
      const contacts = response.data.contacts || [];
      const users = response.data.users || [];
      const contactStatuses = response.data.contact_status || [];
      const territories = response.data.territories || [];

      if (contacts.length === 0) break;

      let pageHasNewData = false;

      for (const contact of contacts) {
        const skipResult = shouldSkipContact(contact);
        if (skipResult.skip) {
          if (skipResult.reason === 'ignored_email_domain') {
            console.log(`*** IGNORING contact ${contact.id} (${contact.display_name}) - contains ignored email domain ***`);
            ignoredByEmailDomain++;
          } else if (skipResult.reason === 'invalid_market_name') {
            console.log(`*** SKIPPING contact ${contact.id} (${contact.display_name}) - invalid/missing market name: "${contact.custom_field?.cf_report_name}" ***`);
            ignoredByMarketName++;
          }
          continue;
        }
        
        const contactDate = new Date(contact.updated_at);
        const lastSyncDate = new Date(lastSync);
        
        if (!isFirstRun && contactDate <= lastSyncDate) {
          console.log(`Reached old data at contact ${contact.id}, stopping sync`);
          keepGoing = false;
          break;
        }

        pageHasNewData = true;
        
        if (contact.updated_at > newestContactSeen) {
          newestContactSeen = contact.updated_at;
        }
        
        contact.owner_name = findOwnerName(contact.owner_id, users);
        contact.status_name = findStatusName(contact.contact_status_id, contactStatuses);
        contact.territory_name = findTerritoryName(contact.territory_id, territories);
        
        const existingContact = await contactsCol.findOne({ id: contact.id });
        let changedFields = {};
        let isNewContact = !existingContact;
        let shouldFetchConversations = false;
        
        if (existingContact) {
          changedFields = detectFieldChanges(existingContact, contact);
          
          if (Object.keys(changedFields).length > 0) {
            recordsWithChanges++;
            
            if (changedFields.last_contacted) {
              shouldFetchConversations = true;
            }
          }
        } else {
          shouldFetchConversations = true;
        }
        
        const currentSyncTime = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T') + '+05:30';
        contact.syncedAt = currentSyncTime;
        contact.lastUpdatedAt = contact.updated_at;
        
        let conversationSummaries = [];
        let fullConversations = [];
        
        if (shouldFetchConversations) {
          const conversationsResponse = await fetchContactConversations(contact.id, contact.display_name);
          
          if (conversationsResponse && conversationsResponse.conversations && conversationsResponse.conversations.length > 0) {
            fullConversations = await processConversationDataEnhanced(conversationsResponse, contact.display_name);
            
            conversationSummaries = await storeConversationsAndGetSummaries(contact.id, fullConversations, db);
            
            conversationsProcessed += fullConversations.reduce((sum, conv) => {
              if (conv.type === 'email_thread') {
                return sum + (conv.messages ? conv.messages.length : 1);
              }
              return sum + 1;
            }, 0);
            
            console.log(`   Processed ${fullConversations.length} conversations (${conversationSummaries.filter(s => s.type === 'email_thread').length} email threads, ${conversationSummaries.filter(s => s.type === 'phone').length} calls, ${conversationSummaries.filter(s => s.type === 'note').length} notes) for ${contact.display_name} [Market: ${contact.custom_field.cf_report_name}]`);
          } else {
            console.log(`   No conversations found for ${contact.display_name} [Market: ${contact.custom_field.cf_report_name}]`);
          }
        } else if (existingContact && existingContact.conversation_summaries) {
          conversationSummaries = existingContact.conversation_summaries;
          console.log(`   Keeping ${existingContact.conversation_summaries.length} existing conversation summaries for ${contact.display_name} [Market: ${contact.custom_field.cf_report_name}]`);
        }
        
        contact.conversation_summaries = conversationSummaries;
        
        const emailThreads = conversationSummaries.filter(c => c.type === 'email_thread');
        const phoneConversations = conversationSummaries.filter(c => c.type === 'phone');
        const notes = conversationSummaries.filter(c => c.type === 'note');
        
        const totalEmailMessages = emailThreads.reduce((sum, thread) => sum + (thread.message_count || 1), 0);
        
        contact.conversation_stats = {
          total_conversations: conversationSummaries.length,
          email_threads: emailThreads.length,
          total_email_messages: totalEmailMessages,
          phone_calls: phoneConversations.length,
          notes: notes.length,
          
          // Detailed email stats
          email_stats: {
            threads_with_replies: emailThreads.filter(t => (t.message_count || 1) > 1).length,
            average_messages_per_thread: emailThreads.length > 0 ? 
              (totalEmailMessages / emailThreads.length).toFixed(2) : 0,
            longest_thread: emailThreads.length > 0 ? 
              Math.max(...emailThreads.map(t => t.message_count || 1)) : 0,
            total_attachments: emailThreads.reduce((sum, t) => sum + (t.attachment_count || 0), 0),
            needs_response: emailThreads.some(t => t.needs_response)
          },
          
          last_conversation_date: conversationSummaries.length > 0 ? 
            Math.max(...conversationSummaries.map(c => new Date(c.last_activity || c.created_at).getTime())) : null
        };
        
        // Calculate CRM analytics using full conversation data for analytics
        const tempConversationsForAnalytics = fullConversations.length > 0 ? fullConversations : [];
        const tempContactForAnalytics = { ...contact, conversations: tempConversationsForAnalytics };
        contact.crm_analytics = calculateCRMAnalytics(tempContactForAnalytics);
        
        let updateData = { ...contact };
        
        if (!isNewContact && Object.keys(changedFields).length > 0) {
          const existingUpdates = existingContact.fieldUpdates || [];
          const newUpdate = {
            syncTime: currentSyncTime,
            updatedAt: contact.updated_at,
            changes: changedFields
          };
          updateData.fieldUpdates = [...existingUpdates, newUpdate];
        }

        await contactsCol.updateOne(
          { id: contact.id },
          { $set: updateData },
          { upsert: true }
        );

        if (existingContact) {
          updatedRecords++;
        } else {
          newRecords++;
        }
        totalProcessed++;
      }

      console.log(`Processed ${contacts.length} contacts on page ${page}`);

      if (!pageHasNewData && !isFirstRun) {
        console.log('No new data on this page, stopping');
        break;
      }

      page++;
      
      if (contacts.length < 100) {
        console.log('Last page reached');
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update sync state with completion
    await updateSyncRunStatus(db, 'completed', {
      sync_start_time: lastSyncStartTime,
      lastSyncAt: newestContactSeen,
      lastSyncCompleted: new Date(),
      totalProcessed,
      newRecords,
      updatedRecords,
      conversationsProcessed,
      ignoredByEmailDomain,
      ignoredByMarketName,
      apiKeyUsed: currentKeyIndex + 1,
      totalApiCalls: apiCallCount
    });

    await stateCol.updateOne(
      { _id: 'contacts_sync' },
      { 
        $set: { 
          lastSyncAt: newestContactSeen,
          lastSyncCompleted: new Date(),
          totalProcessed,
          newRecords,
          updatedRecords,
          conversationsProcessed,
          ignoredByEmailDomain,
          ignoredByMarketName,
          apiKeyUsed: currentKeyIndex + 1,
          totalApiCalls: apiCallCount
        } 
      },
      { upsert: true }
    );

    lastSyncEndTime = new Date();
    const duration = lastSyncEndTime - lastSyncStartTime;

    // Log summary
    console.log(`✅ Sync #${syncAttempts} completed successfully!`);
    console.log(`⏱️ Duration: ${Math.round(duration / 1000)}s (${Math.round(duration / 60000)}m)`);
    console.log(`📊 Total processed: ${totalProcessed}`);
    console.log(`🆕 New records: ${newRecords}`);
    console.log(`📝 Updated records: ${updatedRecords}`);
    console.log(`🔄 Records with field changes: ${recordsWithChanges}`);
    console.log(`💬 Total conversations processed: ${conversationsProcessed}`);
    console.log(`🚫 Ignored by email domain: ${ignoredByEmailDomain}`);
    console.log(`🚫 Ignored by missing/invalid market name: ${ignoredByMarketName}`);
    console.log(`🚫 Total ignored contacts: ${ignoredByEmailDomain + ignoredByMarketName}`);
    console.log(`🔑 Ended sync using API Key ${currentKeyIndex + 1}/${API_KEYS.length} (${apiCallCount} calls made)`);
    console.log(`⏭️ Next sync will start from: ${newestContactSeen}`);
    console.log(`📚 Conversations stored separately for efficient querying`);

    return true;

  } catch (error) {
    console.error('❌ Sync failed:', error);
    
    // Update sync state with failure
    const client2 = new MongoClient(MONGO_URI);
    try {
      await client2.connect();
      const db = client2.db();
      await updateSyncRunStatus(db, 'failed', {
        sync_start_time: lastSyncStartTime,
        error_message: error.message,
        error_stack: error.stack
      });
    } catch (dbError) {
      console.error('Failed to update sync status with error:', dbError);
    } finally {
      await client2.close();
    }
    
    throw error;
  } finally {
    isSyncRunning = false;
    lastSyncEndTime = new Date();
    await client.close();
  }
}

/**
 * Scheduled sync wrapper that handles collision detection
 */
async function scheduledSync() {
  const now = new Date();
  console.log(`\n🕒 Scheduled sync triggered at ${now.toLocaleString()}`);
  
  try {
    const syncStarted = await syncContacts();
    
    if (!syncStarted) {
      console.log(`⏭️ Sync skipped at ${now.toLocaleString()} - another sync is already running`);
      console.log(`⏰ Next sync attempt will be in 15 minutes at ${new Date(now.getTime() + 15 * 60 * 1000).toLocaleString()}`);
    } else {
      console.log(`✅ Sync completed successfully at ${new Date().toLocaleString()}`);
    }
  } catch (error) {
    console.error(`❌ Scheduled sync failed at ${now.toLocaleString()}:`, error.message);
  }
}

/**
 * Get current sync status and statistics
 */
async function getSyncStatus() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    const stateCol = db.collection('sync_state');
    const contactsCol = db.collection('contacts');
    const conversationsCol = db.collection('conversations');

    const state = await stateCol.findOne({ _id: 'contacts_sync' });
    const totalContacts = await contactsCol.countDocuments();
    const contactsWithConversations = await contactsCol.countDocuments({ 
      "conversation_summaries.0": { $exists: true } 
    });
    const totalConversations = await conversationsCol.countDocuments();
    const conversationsByType = await conversationsCol.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]).toArray();

    // Territory statistics
    const territoryStats = await contactsCol.aggregate([
      { $group: { _id: "$territory_name", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    // Market name statistics
    const marketStats = await contactsCol.aggregate([
      { $group: { _id: "$custom_field.cf_report_name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    console.log('\n📊 Current Sync Status:');
    console.log(`🔑 Available API Keys: ${API_KEYS.length}`);
    console.log(`🔑 Current API Key: ${currentKeyIndex + 1}/${API_KEYS.length} (${apiCallCount}/${MAX_CALLS_PER_KEY} calls used)`);
    console.log(`🏃‍♂️ Current process sync running: ${isSyncRunning ? 'YES' : 'NO'}`);
    
    if (state) {
      console.log(`📊 Database sync status: ${state.sync_status || 'unknown'}`);
      console.log(`⏰ Last sync: ${state.lastSyncAt}`);
      console.log(`✅ Last completed: ${state.lastSyncCompleted}`);
      
      if (state.sync_start_time && state.sync_end_time) {
        const duration = new Date(state.sync_end_time) - new Date(state.sync_start_time);
        console.log(`⏱️ Last sync duration: ${Math.round(duration / 1000)}s`);
      }
      
      console.log(`📈 Last run stats: ${state.newRecords || 0} new, ${state.updatedRecords || 0} updated`);
      console.log(`💬 Conversations processed: ${state.conversationsProcessed || 0}`);
      console.log(`🚫 Ignored by email domain: ${state.ignoredByEmailDomain || 0}`);
      console.log(`🚫 Ignored by market name: ${state.ignoredByMarketName || 0}`);
      console.log(`🔑 API Key used in last sync: ${state.apiKeyUsed || 1}`);
      console.log(`📞 Total API calls in last sync: ${state.totalApiCalls || 0}`);
    } else {
      console.log('❗ No sync history found - first run will get all contacts');
    }
    
    console.log(`📁 Total contacts in DB: ${totalContacts}`);
    console.log(`💬 Contacts with conversations: ${contactsWithConversations}`);
    console.log(`📚 Total conversations stored: ${totalConversations}`);
    console.log(`📊 Conversation breakdown:`, conversationsByType);
    console.log(`🚫 Ignored email domains: ${IGNORED_EMAIL_DOMAINS.join(', ')}`);
    
    if (territoryStats.length > 0) {
      console.log('🌍 Territory Distribution:');
      territoryStats.slice(0, 5).forEach(stat => {
        console.log(`     ${stat._id || 'Unknown'}: ${stat.count} contacts`);
      });
    }

    if (marketStats.length > 0) {
      console.log('🏢 Top Market Names:');
      marketStats.forEach(stat => {
        console.log(`     ${stat._id || 'Unknown'}: ${stat.count} contacts`);
      });
    }
    
    if (lastSyncStartTime) {
      console.log(`🚀 Process stats: ${syncAttempts} attempts, last started: ${lastSyncStartTime.toLocaleString()}`);
    }
    
    return state;
  } finally {
    await client.close();
  }
}

/**
 * Initialize the service
 */
async function initialize() {
  console.log(' Starting Freshworks Contact Sync Service...');
  console.log(`🚫Email domains to ignore: ${IGNORED_EMAIL_DOMAINS.join(', ')}`);

  
  await getSyncStatus();
  
  console.log('\n🏃‍♂️ Running initial sync...');
  await scheduledSync();
  
  // Schedule sync every 3 hours: 0:00, 3:00, 6:00, 9:00, 12:00, 15:00, 18:00, 21:00
  cron.schedule('*/15 * * * *', scheduledSync, {
    timezone: "Asia/Kolkata"
  });
  

  
  // Status check every hour
  cron.schedule('0 * * * *', () => {
    console.log('\n📊 Hourly Status Check:');
    getSyncStatus().catch(console.error);
  }, {
    timezone: "Asia/Kolkata"
  });
}

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  isSyncRunning = false;
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  isSyncRunning = false;
  process.exit(0);
});

function getEmptyAnalytics(contact) {
  const createdDate = new Date(contact.created_at);
  const now = new Date();
  
  return {
    first_contact: null,
    first_call: null,
    first_email_sent: null,
    first_email_received: null,
    last_contact: null,
    engagement: {
      total_touchpoints: 0,
      outgoing_emails: 0,
      incoming_emails: 0,
      outgoing_calls: 0,
      incoming_calls: 0,
      email_opens: 0,
      email_clicks: 0,
      email_replies: 0,
      call_answers: 0,
      call_duration_total: 0,
      avg_call_duration: 0
    },
    response_metrics: {
      first_response_time: null,
      avg_response_time: null,
      last_response_date: null,
      response_rate: 0,
      needs_follow_up: true
    },
    lead_progression: {
      days_in_pipeline: Math.ceil((now - createdDate) / (1000 * 60 * 60 * 24)),
      status_changes: [],
      qualification_score: contact.lead_score || 0,
      next_action_due: null,
      last_action_date: null
    },
    contact_frequency: {
      last_7_days: 0,
      last_30_days: 0,
      last_90_days: 0,
      avg_contacts_per_week: 0
    },
    meetings: {
      scheduled: 0,
      completed: 0,
      no_shows: 0,
      next_meeting: null
    }
  };
}

initialize().catch(error => {
  console.error('❌ Failed to initialize:', error);
  process.exit(1);
});