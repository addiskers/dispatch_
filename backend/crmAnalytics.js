/**
 * Calculate comprehensive CRM analytics for a contact with IST timestamps and user tracking
 */
function calculateCRMAnalytics(contact) {
  const conversations = contact.conversations || [];
  const createdDate = new Date(contact.created_at);
  const now = new Date();
  
  // Helper function to convert to IST format
  const toISTFormat = (date) => {
    if (!date) return null;
    const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000)); // Add 5.5 hours for IST
    return istDate.toISOString().replace('Z', '+05:30');
  };

  // Initialize analytics object
  const analytics = {
    first_contact: null,
    first_call: null,
    first_email_sent: null,
    first_email_received: null,
    last_contact: null,
    
    // User activity tracking - WHO is working this lead
    user_activities: {}, // Will store per-user statistics
    primary_user: null,  // User with most activity
    total_users_involved: 0,
    
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

  // Process all conversations to calculate statistics
  const allInteractions = [];
  
  conversations.forEach(conversation => {
    if (conversation.type === 'email_thread') {
      // Process email thread
      conversation.messages.forEach(message => {
        const messageDate = new Date(message.timestamp);
        allInteractions.push({
          date: messageDate,
          ist_date: toISTFormat(messageDate),
          type: 'email',
          direction: message.direction,
          user_id: message.sender.id,
          user_name: message.sender.name,
          user_email: message.sender.email,
          subject: message.subject,
          is_automated: isAutomatedEmail(message),
          engagement: message.engagement,
          conversation: conversation,
          message: message
        });
      });
    } else if (conversation.type === 'phone') {
      // Process phone call
      const callDate = new Date(conversation.created_at);
      allInteractions.push({
        date: callDate,
        ist_date: toISTFormat(callDate),
        type: 'phone',
        direction: conversation.call_direction,
        duration: conversation.call_duration,
        outcome: conversation.outcome?.name,
        user_id: conversation.user_details?.id,
        user_name: conversation.user_details?.name,
        user_email: conversation.user_details?.email,
        conversation: conversation
      });
    } else if (conversation.type === 'note') {
      // Process notes
      const noteDate = new Date(conversation.created_at);
      allInteractions.push({
        date: noteDate,
        ist_date: toISTFormat(noteDate),
        type: 'note',
        direction: 'outgoing',
        user_id: null,
        user_name: null,
        user_email: null,
        conversation: conversation
      });
    }
  });

  // Sort interactions by date
  allInteractions.sort((a, b) => a.date - b.date);

  // Track user activities - WHO is doing what on this lead
  const userActivities = {};
  
  allInteractions.forEach(interaction => {
    const userId = interaction.user_id;
    const userName = interaction.user_name || 'Unknown User';
    const userEmail = interaction.user_email;
    
    // Skip if no user (like notes without user info)
    if (!userId) return;
    
    // Initialize user if not exists
    if (!userActivities[userId]) {
      userActivities[userId] = {
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        first_activity: interaction.ist_date,
        last_activity: interaction.ist_date,
        total_activities: 0,
        emails_sent: 0,
        calls_made: 0,
        call_duration_total: 0,
        follow_ups: 0, // Count of activities after first contact
        activity_breakdown: {
          last_7_days: 0,
          last_30_days: 0,
          total: 0
        }
      };
    }
    
    const userActivity = userActivities[userId];
    
    // Update user activity
    userActivity.last_activity = interaction.ist_date;
    userActivity.total_activities++;
    
    // Count specific activities
    if (interaction.type === 'email' && interaction.direction === 'outgoing') {
      userActivity.emails_sent++;
    }
    if (interaction.type === 'phone' && interaction.direction === 'outgoing') {
      userActivity.calls_made++;
      if (interaction.duration) {
        userActivity.call_duration_total += interaction.duration;
      }
    }
    
    // Count time-based activities
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    if (interaction.date >= sevenDaysAgo) {
      userActivity.activity_breakdown.last_7_days++;
    }
    if (interaction.date >= thirtyDaysAgo) {
      userActivity.activity_breakdown.last_30_days++;
    }
    userActivity.activity_breakdown.total++;
  });

  // Count follow-ups for each user (activities after their first contact)
  Object.values(userActivities).forEach(userActivity => {
    const userInteractions = allInteractions.filter(i => i.user_id === userActivity.user_id);
    // Everything after the first interaction is a follow-up
    userActivity.follow_ups = Math.max(0, userInteractions.length - 1);
  });

  // Find primary user (most active)
  let primaryUser = null;
  let maxActivities = 0;
  Object.values(userActivities).forEach(userActivity => {
    if (userActivity.total_activities > maxActivities) {
      maxActivities = userActivity.total_activities;
      primaryUser = {
        user_id: userActivity.user_id,
        user_name: userActivity.user_name,
        user_email: userActivity.user_email,
        total_activities: userActivity.total_activities
      };
    }
  });

  // Store user activities in analytics
  analytics.user_activities = userActivities;
  analytics.primary_user = primaryUser;
  analytics.total_users_involved = Object.keys(userActivities).length;

  // Calculate first contact (with IST time)
  if (allInteractions.length > 0) {
    const firstInteraction = allInteractions[0];
    analytics.first_contact = {
      date: firstInteraction.ist_date,
      type: firstInteraction.type,
      direction: firstInteraction.direction,
      user_id: firstInteraction.user_id,
      user_name: firstInteraction.user_name,
      user_email: firstInteraction.user_email
    };
  }

  // Calculate last contact (with IST time)
  if (allInteractions.length > 0) {
    const lastInteraction = allInteractions[allInteractions.length - 1];
    analytics.last_contact = {
      date: lastInteraction.ist_date,
      type: lastInteraction.type,
      direction: lastInteraction.direction,
      user_id: lastInteraction.user_id,
      user_name: lastInteraction.user_name,
      user_email: lastInteraction.user_email
    };
    analytics.lead_progression.last_action_date = lastInteraction.ist_date;
  }

  // Calculate first call (with IST time)
  const firstCall = allInteractions.find(i => i.type === 'phone');
  if (firstCall) {
    analytics.first_call = {
      date: firstCall.ist_date,
      direction: firstCall.direction,
      duration: firstCall.duration,
      outcome: firstCall.outcome,
      user_id: firstCall.user_id,
      user_name: firstCall.user_name,
      user_email: firstCall.user_email
    };
  }

  // Calculate first email sent (non-automated, with IST time)
  const firstEmailSent = allInteractions.find(i => 
    i.type === 'email' && 
    i.direction === 'outgoing' && 
    !i.is_automated
  );
  if (firstEmailSent) {
    analytics.first_email_sent = {
      date: firstEmailSent.ist_date,
      subject: firstEmailSent.subject,
      is_automated: false,
      user_id: firstEmailSent.user_id,
      user_name: firstEmailSent.user_name,
      user_email: firstEmailSent.user_email
    };
  }

  // Calculate first email received (with IST time)
  const firstEmailReceived = allInteractions.find(i => 
    i.type === 'email' && 
    i.direction === 'incoming'
  );
  if (firstEmailReceived) {
    analytics.first_email_received = {
      date: firstEmailReceived.ist_date,
      subject: firstEmailReceived.subject
    };
    analytics.response_metrics.last_response_date = firstEmailReceived.ist_date;
  }

  // Calculate engagement metrics
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  allInteractions.forEach(interaction => {
    analytics.engagement.total_touchpoints++;

    // Count by type and direction
    if (interaction.type === 'email') {
      if (interaction.direction === 'outgoing') {
        analytics.engagement.outgoing_emails++;
      } else {
        analytics.engagement.incoming_emails++;
        if (interaction.engagement?.opened) analytics.engagement.email_opens++;
        if (interaction.engagement?.clicked) analytics.engagement.email_clicks++;
      }
    } else if (interaction.type === 'phone') {
      if (interaction.direction === 'outgoing') {
        analytics.engagement.outgoing_calls++;
      } else {
        analytics.engagement.incoming_calls++;
      }
      
      if (interaction.duration > 0) {
        analytics.engagement.call_answers++;
        analytics.engagement.call_duration_total += interaction.duration;
      }
    }

    // Count by time periods
    if (interaction.date >= sevenDaysAgo) {
      analytics.contact_frequency.last_7_days++;
    }
    if (interaction.date >= thirtyDaysAgo) {
      analytics.contact_frequency.last_30_days++;
    }
    if (interaction.date >= ninetyDaysAgo) {
      analytics.contact_frequency.last_90_days++;
    }
  });

  // Calculate averages
  if (analytics.engagement.outgoing_calls + analytics.engagement.incoming_calls > 0) {
    analytics.engagement.avg_call_duration = 
      analytics.engagement.call_duration_total / 
      (analytics.engagement.outgoing_calls + analytics.engagement.incoming_calls);
  }

  // Calculate response rate
  const totalOutreach = analytics.engagement.outgoing_emails + analytics.engagement.outgoing_calls;
  const totalResponses = analytics.engagement.incoming_emails + analytics.engagement.incoming_calls + analytics.engagement.call_answers;
  if (totalOutreach > 0) {
    analytics.response_metrics.response_rate = (totalResponses / totalOutreach) * 100;
  }

  // Calculate contact frequency per week
  const weeksInPipeline = analytics.lead_progression.days_in_pipeline / 7;
  if (weeksInPipeline > 0) {
    analytics.contact_frequency.avg_contacts_per_week = 
      analytics.engagement.total_touchpoints / weeksInPipeline;
  }

  // Determine if follow-up is needed
  const lastContactDate = analytics.last_contact ? new Date(analytics.last_contact.date) : null;
  const daysSinceLastContact = lastContactDate ? 
    Math.ceil((now - lastContactDate) / (1000 * 60 * 60 * 24)) : null;
  
  analytics.response_metrics.needs_follow_up = 
    !lastContactDate || 
    daysSinceLastContact > 7 || 
    (analytics.engagement.incoming_emails === 0 && analytics.engagement.outgoing_emails > 0);

  // Calculate next action due (IST format)
  if (lastContactDate && analytics.response_metrics.needs_follow_up) {
    const nextActionDate = new Date(lastContactDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    analytics.lead_progression.next_action_due = toISTFormat(nextActionDate);
  }

  return analytics;
}

/**
 * Determine if an email is automated based on various criteria
 */
function isAutomatedEmail(message) {
  if (!message || !message.subject) return false;
  
  const subject = message.subject.toLowerCase();
  const content = (message.content || '').toLowerCase();
  
  // Check for common automated email patterns
  const automatedPatterns = [
    'automated',
    'auto-reply',
    'out of office',
    'vacation',
    'delivery failure',
    'bounce',
    'undelivered',
    'mail delivery',
    'no-reply',
    'noreply',
    'do not reply',
    'newsletter',
    'unsubscribe',
    'marketing',
    'bulk',
    'campaign'
  ];
  
  const isAutomated = automatedPatterns.some(pattern => 
    subject.includes(pattern) || content.includes(pattern)
  );
  
  // Additional checks
  const senderEmail = message.sender?.email?.toLowerCase() || '';
  const hasNoReplyEmail = senderEmail.includes('noreply') || 
                          senderEmail.includes('no-reply') || 
                          senderEmail.includes('donotreply');
  
  return isAutomated || hasNoReplyEmail;
}

/**
 * Get empty analytics with IST timestamps and user tracking
 */
function getEmptyAnalytics(contact) {
  const createdDate = new Date(contact.created_at);
  const now = new Date();
  
  return {
    first_contact: null,
    first_call: null,
    first_email_sent: null,
    first_email_received: null,
    last_contact: null,
    
    // User tracking
    user_activities: {},
    primary_user: null,
    total_users_involved: 0,
    
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

// Export functions for use in your sync process
module.exports = {
  calculateCRMAnalytics,
  isAutomatedEmail,
  getEmptyAnalytics
};