// syncContacts.js - Freshworks CRM to MongoDB Contact Sync Service
require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');

// Configuration from environment variables
const {
  MONGO_URI = 'mongodb://localhost:27017/sale',
  FRESHWORKS_API_KEY,
  FRESHWORKS_BASE_URL
} = process.env;

// Validate required environment variables
if (!FRESHWORKS_API_KEY || !FRESHWORKS_BASE_URL) {
  console.error('Missing required environment variables: FRESHWORKS_API_KEY, FRESHWORKS_BASE_URL');
  process.exit(1);
}

// Email domains to exclude from sync
const IGNORED_EMAIL_DOMAINS = ['skyquestt.com', 'gii.co.jp'];

// API headers for Freshworks requests
const headers = {
  "Authorization": `Token token=${FRESHWORKS_API_KEY}`,
  "Content-Type": "application/json",
  "Accept": "*/*"
};

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
  
  // Check if any email contains ignored domains
  return emailsToCheck.some(email => 
    IGNORED_EMAIL_DOMAINS.some(domain => 
      email.toLowerCase().includes(domain.toLowerCase())
    )
  );
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
    console.log(`     Fetching conversations for contact ${contactId}${nameInfo}...`);
    
    const apiUrl = `${FRESHWORKS_BASE_URL}/contacts/${contactId}/conversations/all` +
                   `?include=email_conversation_recipients,targetable,phone_number,phone_caller,note,user&per_page=100`;
    
    const response = await axios.get(apiUrl, { 
      headers,
      validateStatus: status => status < 500,
      timeout: 15000
    });
    
    // Check for authentication issues (HTML response instead of JSON)
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
    console.log(`     Fetching complete email thread for ${emailId}${nameInfo}...`);
    
    let allEmailConversations = [];
    let allEmailRecipients = [];
    let allUsers = [];
    let allContacts = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const apiUrl = `${FRESHWORKS_BASE_URL}/emails/${emailId}` +
                     `?include=email_conversation_recipients,attachments,targetable&page=${page}`;
      
      const response = await axios.get(apiUrl, { 
        headers,
        validateStatus: status => status < 500,
        timeout: 15000
      });
      
      // Check for authentication issues
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
      
      // Merge other data
      if (response.data.email_conversation_recipients) {
        allEmailRecipients.push(...response.data.email_conversation_recipients);
      }
      if (response.data.users) {
        allUsers.push(...response.data.users);
      }
      if (response.data.contacts) {
        allContacts.push(...response.data.contacts);
      }
      
      console.log(`       Page ${page}: Found ${emailConversations.length} email conversations`);
      page++;
      
      // Rate limiting
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

  // Sort messages by conversation time to maintain chronological order
  const sortedMessages = email_conversations.sort((a, b) => 
    new Date(a.conversation_time) - new Date(b.conversation_time)
  );

  const messages = [];

  sortedMessages.forEach((emailConv, index) => {
    // Process email recipients for this message
    const emailRecipientIds = emailConv.email_conversation_recipient_ids || [];
    const relevantRecipients = email_conversation_recipients.filter(er => 
      emailRecipientIds.includes(er.id)
    );

    const participants = relevantRecipients.map(recipient => {
      // Find user or contact details
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
        field: recipient.field, // from, to, cc, bcc, reply_to
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

    // Find sender (from field)
    const sender = participants.find(p => p.field === 'from') || {};

    // Process attachments for this message
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
      direction: emailConv.direction, // incoming/outgoing
      is_read: emailConv.is_read,
      needs_response: emailConv.needs_response,
      status: emailConv.status,
      
      // Sender details
      sender: {
        name: sender.name || 'Unknown',
        email: sender.email || '',
        is_user: sender.is_user || false,
        id: sender.id || null,
        type: sender.type || 'unknown'
      },
      
      // All participants (from, to, cc, bcc, reply_to)
      participants: participants,
      
      // Attachments for this message
      attachments: attachments,
      
      // Engagement metrics
      engagement: {
        opened: participants.some(p => p.opened),
        clicked: participants.some(p => p.clicked),
        bounced: participants.some(p => p.bounced),
        opened_time: participants.find(p => p.opened_time)?.opened_time || null,
        clicked_time: participants.find(p => p.clicked_time)?.clicked_time || null
      },
      
      // Linked deals for this message
      linked_deals: emailConv.linked_deals || []
    };

    messages.push(message);
  });

  // Create the complete thread object
  const emailThread = {
    id: `email-thread-${emailId}`,
    type: 'email_thread',
    email_id: emailId,
    thread_count: messages.length,
    
    // Thread metadata
    subject: messages[0]?.subject || 'No Subject',
    first_message_date: messages[0]?.timestamp || null,
    last_message_date: messages[messages.length - 1]?.timestamp || null,
    
    // Thread statistics
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
    
    // All messages in chronological order (0, 1, 2, ...)
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
      // Find the corresponding email conversation to get email_id
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
      // Process phone conversation
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
        // Basic call information
        processedConv.created_at = phoneCall.conversation_time;
        processedConv.updated_at = phoneCall.conversation_time;
        processedConv.call_duration = phoneCall.call_duration;
        processedConv.call_recording_url = phoneCall.recording;
        processedConv.call_direction = phoneCall.call_direction ? 'incoming' : 'outgoing';
        processedConv.call_status = phoneCall.status;
        processedConv.content = `${processedConv.call_direction} call - Duration: ${phoneCall.call_duration}s`;
        
        // Get phone number from phone_caller (the contact's number)
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
        
        // Get user details (who made/received the call)
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
      // Process note conversation
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

  // Fetch complete email threads - each thread contains ALL messages
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
    
    // Rate limiting between email thread requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`       Successfully processed ${processedConversations.length} total conversations for ${contactName}`);
  return processedConversations;
}

/**
 * Process conversation data into structured format (fallback for existing code)
 */
async function processConversationData(conversationsResponse) {
  // Use the enhanced version by default
  return processConversationDataEnhanced(conversationsResponse, 'Contact');
}

/**
 * Main sync function - syncs contacts from Freshworks to MongoDB
 */
async function syncContacts() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    const contactsCol = db.collection('contacts');
    const stateCol = db.collection('sync_state');

    // Get last sync state
    const state = await stateCol.findOne({ _id: 'contacts_sync' });
    let lastSync = state ? state.lastSyncAt : "2020-01-01T00:00:00+05:30";
    const isFirstRun = !state;
    
    console.log(isFirstRun ? 'First run - getting ALL contacts' : `Continuing sync from: ${lastSync}`);

    // Initialize counters
    let page = 1;
    let keepGoing = true;
    let totalProcessed = 0;
    let newRecords = 0;
    let updatedRecords = 0;
    let recordsWithChanges = 0;
    let conversationsProcessed = 0;
    let ignoredContacts = 0;
    let newestContactSeen = lastSync;

    // Process contacts page by page
    while (keepGoing) {
      console.log(`Processing page ${page}...`);
      
      const url = `${FRESHWORKS_BASE_URL}/api/contacts/view/402001974783` +
                  `?per_page=100&page=${page}` +
                  `&sort=updated_at&sort_type=desc&include=owner,contact_status,territory`;

      const response = await axios.get(url, { headers });
      const contacts = response.data.contacts || [];
      const users = response.data.users || [];
      const contactStatuses = response.data.contact_status || [];
      const territories = response.data.territories || [];

      if (contacts.length === 0) break;

      let pageHasNewData = false;

      for (const contact of contacts) {
        // Skip ignored contacts
        if (shouldIgnoreContact(contact)) {
          console.log(`*** IGNORING contact ${contact.id} - contains ignored email domain ***`);
          ignoredContacts++;
          continue;
        }
        
        const contactDate = new Date(contact.updated_at);
        const lastSyncDate = new Date(lastSync);
        
        // Stop if we've reached old data (not first run)
        if (!isFirstRun && contactDate <= lastSyncDate) {
          console.log(`Reached old data at contact ${contact.id}, stopping sync`);
          keepGoing = false;
          break;
        }

        pageHasNewData = true;
        
        // Update newest contact timestamp
        if (contact.updated_at > newestContactSeen) {
          newestContactSeen = contact.updated_at;
        }
        
        // Enrich contact with owner, status, and territory names
        contact.owner_name = findOwnerName(contact.owner_id, users);
        contact.status_name = findStatusName(contact.contact_status_id, contactStatuses);
        contact.territory_name = findTerritoryName(contact.territory_id, territories);
        
        // Check if contact exists and detect changes
        const existingContact = await contactsCol.findOne({ id: contact.id });
        let changedFields = {};
        let isNewContact = !existingContact;
        let shouldFetchConversations = false;
        
        if (existingContact) {
          changedFields = detectFieldChanges(existingContact, contact);
          
          if (Object.keys(changedFields).length > 0) {
            recordsWithChanges++;
            
            // Fetch conversations if last_contacted changed
            if (changedFields.last_contacted) {
              shouldFetchConversations = true;
            }
          }
        } else {
          // Always fetch conversations for new contacts
          shouldFetchConversations = true;
        }
        
        // Add sync metadata
        const currentSyncTime = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T') + '+05:30';
        contact.syncedAt = currentSyncTime;
        contact.lastUpdatedAt = contact.updated_at;
        
        // Fetch conversations if needed
        if (shouldFetchConversations) {
          const conversationsResponse = await fetchContactConversations(contact.id, contact.display_name);
          
          if (conversationsResponse && conversationsResponse.conversations && conversationsResponse.conversations.length > 0) {
            contact.conversations = await processConversationDataEnhanced(conversationsResponse, contact.display_name);
            
            // Calculate thread statistics
            const emailThreads = contact.conversations.filter(c => c.type === 'email_thread');
            const phoneConversations = contact.conversations.filter(c => c.type === 'phone');
            const notes = contact.conversations.filter(c => c.type === 'note');
            
            // Calculate total messages across all email threads
            const totalEmailMessages = emailThreads.reduce((sum, thread) => sum + thread.messages.length, 0);
            
            contact.conversation_stats = {
              total_conversations: contact.conversations.length,
              email_threads: emailThreads.length,
              total_email_messages: totalEmailMessages,
              phone_calls: phoneConversations.length,
              notes: notes.length,
              
              // Detailed email stats
              email_stats: {
                threads_with_replies: emailThreads.filter(t => t.messages.length > 1).length,
                average_messages_per_thread: emailThreads.length > 0 ? 
                  (totalEmailMessages / emailThreads.length).toFixed(2) : 0,
                longest_thread: emailThreads.length > 0 ? 
                  Math.max(...emailThreads.map(t => t.messages.length)) : 0,
                total_attachments: emailThreads.reduce((sum, t) => sum + t.stats.total_attachments, 0),
                needs_response: emailThreads.some(t => t.stats.needs_response)
              },
              
              last_conversation_date: contact.conversations.length > 0 ? 
                Math.max(...contact.conversations.map(c => {
                  if (c.type === 'email_thread') {
                    return new Date(c.last_message_date);
                  }
                  return new Date(c.created_at);
                })) : null
            };
            
            conversationsProcessed += totalEmailMessages + phoneConversations.length + notes.length;
            console.log(`   Processed ${contact.conversations.length} conversations (${emailThreads.length} email threads with ${totalEmailMessages} messages, ${phoneConversations.length} calls, ${notes.length} notes) for ${contact.display_name}`);
          } else {
            contact.conversations = [];
            contact.conversation_stats = {
              total_conversations: 0,
              email_threads: 0,
              total_email_messages: 0,
              phone_calls: 0,
              notes: 0,
              email_stats: {
                threads_with_replies: 0,
                average_messages_per_thread: 0,
                longest_thread: 0,
                total_attachments: 0,
                needs_response: false
              },
              last_conversation_date: null
            };
            console.log(`   No conversations found for ${contact.display_name}`);
          }
        } else if (existingContact && existingContact.conversations) {
          // Keep existing conversations
          contact.conversations = existingContact.conversations;
          contact.conversation_stats = existingContact.conversation_stats || {};
          console.log(`   Keeping ${existingContact.conversations.length} existing conversations for ${contact.display_name}`);
        } else {
          contact.conversations = [];
          contact.conversation_stats = {
            total_conversations: 0,
            email_threads: 0,
            total_email_messages: 0,
            phone_calls: 0,
            notes: 0,
            email_stats: {
              threads_with_replies: 0,
              average_messages_per_thread: 0,
              longest_thread: 0,
              total_attachments: 0,
              needs_response: false
            },
            last_conversation_date: null
          };
        }
        
        // Prepare update data
        let updateData = { ...contact };
        
        // Add field update history for existing contacts with changes
        if (!isNewContact && Object.keys(changedFields).length > 0) {
          const existingUpdates = existingContact.fieldUpdates || [];
          const newUpdate = {
            syncTime: currentSyncTime,
            updatedAt: contact.updated_at,
            changes: changedFields
          };
          updateData.fieldUpdates = [...existingUpdates, newUpdate];
        }

        // Upsert contact to MongoDB
        await contactsCol.updateOne(
          { id: contact.id },
          { $set: updateData },
          { upsert: true }
        );

        // Update counters
        if (existingContact) {
          updatedRecords++;
        } else {
          newRecords++;
        }
        totalProcessed++;
      }

      console.log(`Processed ${contacts.length} contacts on page ${page}`);

      // Stop if no new data and not first run
      if (!pageHasNewData && !isFirstRun) {
        console.log('No new data on this page, stopping');
        break;
      }

      page++;
      
      // Stop if less than full page (last page)
      if (contacts.length < 100) {
        console.log('Last page reached');
        break;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update sync state
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
          ignoredContacts
        } 
      },
      { upsert: true }
    );

    // Log summary
    console.log(`Sync completed successfully!`);
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`New records: ${newRecords}`);
    console.log(`Updated records: ${updatedRecords}`);
    console.log(`Records with field changes: ${recordsWithChanges}`);
    console.log(`Total conversations processed: ${conversationsProcessed}`);
    console.log(`Ignored contacts: ${ignoredContacts}`);
    console.log(`Next sync will start from: ${newestContactSeen}`);

  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  } finally {
    await client.close();
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

    const state = await stateCol.findOne({ _id: 'contacts_sync' });
    const totalContacts = await contactsCol.countDocuments();
    const contactsWithConversations = await contactsCol.countDocuments({ 
      "conversations.0": { $exists: true } 
    });

    // Territory statistics
    const territoryStats = await contactsCol.aggregate([
      { $group: { _id: "$territory_name", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('Current Sync Status:');
    if (state) {
      console.log(`   Last sync: ${state.lastSyncAt}`);
      console.log(`   Last completed: ${state.lastSyncCompleted}`);
      console.log(`   Last run stats: ${state.newRecords} new, ${state.updatedRecords} updated`);
      console.log(`   Conversations processed: ${state.conversationsProcessed || 0}`);
      console.log(`   Ignored contacts: ${state.ignoredContacts || 0}`);
    } else {
      console.log('   No sync history found - first run will get all contacts');
    }
    console.log(`   Total contacts in DB: ${totalContacts}`);
    console.log(`   Contacts with conversations: ${contactsWithConversations}`);
    console.log(`   Ignored email domains: ${IGNORED_EMAIL_DOMAINS.join(', ')}`);
    
    if (territoryStats.length > 0) {
      console.log('   Territory Distribution:');
      territoryStats.forEach(stat => {
        console.log(`     ${stat._id || 'Unknown'}: ${stat.count} contacts`);
      });
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
  console.log('Starting Freshworks Contact Sync Service...');
  console.log(`Email domains to ignore: ${IGNORED_EMAIL_DOMAINS.join(', ')}`);
  
  await getSyncStatus();
  
  console.log('Running initial sync...');
  await syncContacts();
  
  // Schedule hourly sync
  cron.schedule('0 * * * *', () => {
    console.log('Running scheduled contacts sync...');
    syncContacts().catch(error => {
      console.error('Scheduled sync failed:', error);
    });
  });
  
  console.log('Service initialized. Syncing every hour at minute 0.');
  console.log('Press Ctrl+C to stop.');
}

// Graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

// Start the service
initialize().catch(error => {
  console.error('Failed to initialize:', error);
  process.exit(1);
});