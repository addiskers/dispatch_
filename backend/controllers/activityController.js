const Contact = require('../models/Contact');
const Conversation = require('../models/Conversation');

const isAutomatedEmail = (message) => {
  if (!message.content && !message.html_content) {
    return false;
  }

  const content = (message.content || message.html_content || '').toLowerCase();
  
  const automatedPatterns = [
    'thank you for contacting skyquest',
    'as requested, allow me some time',
    'i will soon be sharing the sample pages',
    'in the meantime, it would greatly assist us',
    'the journey of a thousand miles begins with a single step'
  ];
  
  let matchCount = 0;
  for (const pattern of automatedPatterns) {
    if (content.includes(pattern)) {
      matchCount++;
    }
  }
  
  return matchCount >= 4;
};

const getSalespersonActivities = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      sortBy = 'activity_date',
      sortOrder = 'desc',
      search = '',
      startDate = '',
      endDate = '',
      activityType = 'all'
    } = req.query;

    const parseFilter = (filterStr) => {
      try {
        const parsed = JSON.parse(filterStr || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    };

    const filters = {
      owner: parseFilter(req.query.owner),
      country: parseFilter(req.query.country),
      territory: parseFilter(req.query.territory),
      leadLevel: parseFilter(req.query.leadLevel),
      contactCategory: parseFilter(req.query.contactCategory)
    };

    const dateConditions = {};
    let hasDateFilter = false;

    if (startDate) {
      const startDateObj = new Date(startDate);
      if (!isNaN(startDateObj.getTime())) {
        dateConditions.$gte = startDateObj;
        hasDateFilter = true;
      }
    }
    
    if (endDate) {
      const endDateObj = new Date(endDate);
      if (!isNaN(endDateObj.getTime())) {
        dateConditions.$lte = endDateObj;
        hasDateFilter = true;
      }
    }

    let conversationsQuery = {};

    if (activityType === 'email') {
      conversationsQuery.type = 'email_thread';
      
      if (hasDateFilter) {
        conversationsQuery.$or = [
          { last_message_date: dateConditions },
          { first_message_date: dateConditions },
          {
            first_message_date: { $lte: dateConditions.$lte || new Date() },
            last_message_date: { $gte: dateConditions.$gte || new Date(0) }
          }
        ];
      }
    } else if (activityType === 'call') {
      conversationsQuery.type = 'phone';
      
      if (hasDateFilter) {
        conversationsQuery.created_at = dateConditions;
      }
    } else {
      if (hasDateFilter) {
        conversationsQuery.$or = [
          { type: 'phone', created_at: dateConditions },
          { 
            type: 'email_thread',
            $or: [
              { last_message_date: dateConditions },
              { first_message_date: dateConditions },
              {
                first_message_date: { $lte: dateConditions.$lte || new Date() },
                last_message_date: { $gte: dateConditions.$gte || new Date(0) }
              }
            ]
          }
        ];
      }
    }

    if (!hasDateFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      dateConditions.$gte = today;
      dateConditions.$lte = tomorrow;
      hasDateFilter = true;
      
      if (activityType === 'email') {
        conversationsQuery.$or = [
          { last_message_date: dateConditions },
          { first_message_date: dateConditions },
          {
            first_message_date: { $lte: tomorrow },
            last_message_date: { $gte: today }
          }
        ];
      } else if (activityType === 'call') {
        conversationsQuery.created_at = dateConditions;
      } else {
        conversationsQuery.$or = [
          { type: 'phone', created_at: dateConditions },
          { 
            type: 'email_thread',
            $or: [
              { last_message_date: dateConditions },
              { first_message_date: dateConditions },
              {
                first_message_date: { $lte: tomorrow },
                last_message_date: { $gte: today }
              }
            ]
          }
        ];
      }
    }

    const SAFETY_LIMIT = 10000;
    
    const conversations = await Conversation.find(conversationsQuery)
      .sort({ created_at: sortOrder === 'asc' ? 1 : -1 })
      .limit(SAFETY_LIMIT)
      .lean();

    if (conversations.length === 0) {
      return res.json({
        success: true,
        data: {
          summary: {
            totalUsers: 0,
            totalActivities: 0,
            totalEmails: 0,
            totalCalls: 0,
            totalConnectedCalls: 0,
            notConnectedCalls: 0,
            uniqueLeadsContacted: 0,
            avgCallDuration: "0",
            connectionRate: "0",
            totalOpenedEmails: 0,
            totalBouncedEmails: 0,
            openRate: "0"
          },
          userSummaries: [],
          activities: [],
          dailyActivities: [],
          openedEmails: [],
          bouncedEmails: []
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: 0,
          totalCount: 0,
          limit: parseInt(limit),
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    const contactIds = [...new Set(conversations.map(c => c.contact_id))];

    const contactQuery = {
      id: { $in: contactIds }
    };

    const buildMultiSelectFilter = (fieldPath, values) => {
      if (!values || values.length === 0) return null;
      const standardValues = values.filter(v => !v.startsWith('Unassigned'));
      const unassignedValues = values.filter(v => v.startsWith('Unassigned'));
      const conditions = [];
      
      if (standardValues.length > 0) {
        conditions.push({ [fieldPath]: { $in: standardValues } });
      }
      if (unassignedValues.length > 0) {
        conditions.push({ [fieldPath]: { $in: [null, '', '-', 'NA', 'na', 'N/A', 'n/a'] } });
      }
      return conditions.length > 0 ? { $or: conditions } : null;
    };

    if (filters.owner.length > 0) {
      const ownerFilter = buildMultiSelectFilter('owner_name', filters.owner);
      if (ownerFilter) {
        contactQuery.$and = contactQuery.$and || [];
        contactQuery.$and.push(ownerFilter);
      }
    }

    if (filters.country.length > 0) {
      const countryFilter = buildMultiSelectFilter('country', filters.country);
      if (countryFilter) {
        contactQuery.$and = contactQuery.$and || [];
        contactQuery.$and.push(countryFilter);
      }
    }

    if (filters.territory.length > 0) {
      const territoryFilter = buildMultiSelectFilter('territory_name', filters.territory);
      if (territoryFilter) {
        contactQuery.$and = contactQuery.$and || [];
        contactQuery.$and.push(territoryFilter);
      }
    }

    if (filters.leadLevel.length > 0) {
      const leadLevelFilter = buildMultiSelectFilter('custom_field.cf_lead_level', filters.leadLevel);
      if (leadLevelFilter) {
        contactQuery.$and = contactQuery.$and || [];
        contactQuery.$and.push(leadLevelFilter);
      }
    }

    if (filters.contactCategory.length > 0) {
      const categoryFilter = buildMultiSelectFilter('custom_field.cf_contact_category', filters.contactCategory);
      if (categoryFilter) {
        contactQuery.$and = contactQuery.$and || [];
        contactQuery.$and.push(categoryFilter);
      }
    }

    if (search) {
      contactQuery.$or = [
        { display_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { owner_name: { $regex: search, $options: 'i' } }
      ];
    }

    const contacts = await Contact.find(contactQuery).lean();

    const contactMap = {};
    contacts.forEach(contact => {
      contactMap[contact.id] = contact;
    });

    const activitiesByUser = {};
    const activityDetails = [];
    const dailyActivityMap = {};
    const openedEmailsList = []; // NEW: Track opened emails
    const bouncedEmailsList = []; // NEW: Track bounced emails

    conversations.forEach(conv => {
      const contact = contactMap[conv.contact_id];
      if (!contact) {
        return;
      }

      if (conv.type === 'email_thread' && conv.messages && conv.messages.length > 0) {
        conv.messages.forEach((message) => {
          if (message.direction !== 'outgoing') {
            return;
          }

          if (isAutomatedEmail(message)) {
            return;
          }

          const messageDate = new Date(message.timestamp);
          
          if (hasDateFilter) {
            if (dateConditions.$gte && messageDate < dateConditions.$gte) {
              return;
            }
            if (dateConditions.$lte && messageDate > dateConditions.$lte) {
              return;
            }
          }

          if (!message.sender || !message.sender.id) {
            return;
          }

          const userId = message.sender.id;
          const userName = message.sender.name || 'Unknown';
          const userEmail = message.sender.email;

          const activityDate = messageDate.toISOString().split('T')[0];
          const activityTime = messageDate;

          // Track daily activities
          if (!dailyActivityMap[activityDate]) {
            dailyActivityMap[activityDate] = { date: activityDate, emails: 0, calls: 0 };
          }
          dailyActivityMap[activityDate].emails++;

          if (!activitiesByUser[userId]) {
            activitiesByUser[userId] = {
              userId,
              userName,
              userEmail,
              totalActivities: 0,
              totalEmails: 0,
              totalCalls: 0,
              connectedCalls: 0,
              notConnectedCalls: 0,
              totalCallDuration: 0,
              uniqueLeadsContacted: new Set(),
              openedEmails: 0,
              bouncedEmails: 0,
              activities: []
            };
          }

          activitiesByUser[userId].totalActivities++;
          activitiesByUser[userId].totalEmails++;
          activitiesByUser[userId].uniqueLeadsContacted.add(conv.contact_id);

          // NEW: Track opened emails
          const isOpened = message.engagement?.opened === true;
          const isBounced = message.engagement?.bounced === true;
          
          if (isOpened) {
            activitiesByUser[userId].openedEmails++;
            
            openedEmailsList.push({
              userId,
              userName,
              userEmail,
              activityDate,
              activityTime,
              contactId: contact.id,
              contactName: contact.display_name,
              contactEmail: contact.email,
              contactCountry: contact.country,
              contactCompany: contact.custom_field?.cf_company_name || 'NA',
              marketName: contact.custom_field?.cf_report_name || 'NA',
              leadLevel: contact.custom_field?.cf_lead_level || 'NA',
              contactCategory: contact.custom_field?.cf_contact_category || 'NA',
              territory: contact.territory_name || 'NA',
              subject: conv.subject || message.subject || 'No Subject',
              openedTime: message.engagement.opened_time ? new Date(message.engagement.opened_time) : null,
              conversationId: conv.conversation_id,
              messageId: message.message_id
            });
          }

          // NEW: Track bounced emails
          if (isBounced) {
            activitiesByUser[userId].bouncedEmails++;
            
            bouncedEmailsList.push({
              userId,
              userName,
              userEmail,
              activityDate,
              activityTime,
              contactId: contact.id,
              contactName: contact.display_name,
              contactEmail: contact.email,
              contactCountry: contact.country,
              contactCompany: contact.custom_field?.cf_company_name || 'NA',
              marketName: contact.custom_field?.cf_report_name || 'NA',
              leadLevel: contact.custom_field?.cf_lead_level || 'NA',
              contactCategory: contact.custom_field?.cf_contact_category || 'NA',
              territory: contact.territory_name || 'NA',
              subject: conv.subject || message.subject || 'No Subject',
              conversationId: conv.conversation_id,
              messageId: message.message_id
            });
          }

          activityDetails.push({
            userId,
            userName,
            userEmail,
            activityDate,
            activityTime,
            activityType: 'Email',
            contactId: contact.id,
            contactName: contact.display_name,
            contactEmail: contact.email,
            contactCountry: contact.country,
            contactCompany: contact.custom_field?.cf_company_name || 'NA',
            marketName: contact.custom_field?.cf_report_name || 'NA',
            leadLevel: contact.custom_field?.cf_lead_level || 'NA',
            contactCategory: contact.custom_field?.cf_contact_category || 'NA',
            territory: contact.territory_name || 'NA',
            subject: conv.subject || message.subject || 'No Subject',
            callDuration: 0,
            callDirection: null,
            isConnected: false,
            isOpened,
            isBounced,
            openedTime: message.engagement?.opened_time || null,
            conversationId: conv.conversation_id,
            messageId: message.message_id
          });
        });
      }
      else if (conv.type === 'phone') {
        const userId = conv.user_details?.id;
        const userName = conv.user_details?.name || 'Unknown';
        const userEmail = conv.user_details?.email;

        if (!userId) {
          return;
        }

        const activityDate = new Date(conv.created_at).toISOString().split('T')[0];
        const activityTime = new Date(conv.created_at);

        // Track daily activities
        if (!dailyActivityMap[activityDate]) {
          dailyActivityMap[activityDate] = { date: activityDate, emails: 0, calls: 0 };
        }
        dailyActivityMap[activityDate].calls++;

        if (!activitiesByUser[userId]) {
          activitiesByUser[userId] = {
            userId,
            userName,
            userEmail,
            totalActivities: 0,
            totalEmails: 0,
            totalCalls: 0,
            connectedCalls: 0,
            notConnectedCalls: 0,
            totalCallDuration: 0,
            uniqueLeadsContacted: new Set(),
            openedEmails: 0,
            bouncedEmails: 0,
            activities: []
          };
        }

        activitiesByUser[userId].totalActivities++;
        activitiesByUser[userId].totalCalls++;
        activitiesByUser[userId].uniqueLeadsContacted.add(conv.contact_id);
        
        const duration = conv.call_duration || 0;
        activitiesByUser[userId].totalCallDuration += duration;
        
        if (duration > 90) {
          activitiesByUser[userId].connectedCalls++;
        } else {
          activitiesByUser[userId].notConnectedCalls++;
        }

        activityDetails.push({
          userId,
          userName,
          userEmail,
          activityDate,
          activityTime,
          activityType: 'Call',
          contactId: contact.id,
          contactName: contact.display_name,
          contactEmail: contact.email,
          contactCountry: contact.country,
          contactCompany: contact.custom_field?.cf_company_name || 'NA',
          marketName: contact.custom_field?.cf_report_name || 'NA',
          leadLevel: contact.custom_field?.cf_lead_level || 'NA',
          contactCategory: contact.custom_field?.cf_contact_category || 'NA',
          territory: contact.territory_name || 'NA',
          subject: conv.subject || 'Phone Call',
          callDuration: duration,
          callDirection: conv.call_direction,
          isConnected: duration > 90,
          conversationId: conv.conversation_id
        });
      }
    });

    Object.values(activitiesByUser).forEach(user => {
      user.uniqueLeadsContacted = user.uniqueLeadsContacted.size;
    });

    const totalUsers = Object.keys(activitiesByUser).length;
    const totalActivities = activityDetails.length;
    const totalEmails = activityDetails.filter(a => a.activityType === 'Email').length;
    const totalCalls = activityDetails.filter(a => a.activityType === 'Call').length;
    const totalConnectedCalls = activityDetails.filter(a => a.activityType === 'Call' && a.isConnected).length;
    const uniqueLeadsContacted = new Set(activityDetails.map(a => a.contactId)).size;
    const callActivities = activityDetails.filter(a => a.activityType === 'Call');
    const avgCallDuration = callActivities.length > 0 
      ? (callActivities.reduce((sum, a) => sum + a.callDuration, 0) / callActivities.length).toFixed(1)
      : '0';

    // NEW: Calculate opened and bounced email metrics
    const totalOpenedEmails = openedEmailsList.length;
    const totalBouncedEmails = bouncedEmailsList.length;
    const openRate = totalEmails > 0 ? ((totalOpenedEmails / totalEmails) * 100).toFixed(1) : '0';

    const dailyActivities = Object.values(dailyActivityMap).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // Sort opened and bounced emails by most recent
    openedEmailsList.sort((a, b) => new Date(b.openedTime || b.activityTime) - new Date(a.openedTime || a.activityTime));
    bouncedEmailsList.sort((a, b) => new Date(b.activityTime) - new Date(a.activityTime));

    activityDetails.sort((a, b) => new Date(b.activityTime) - new Date(a.activityTime));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedActivities = activityDetails.slice(skip, skip + parseInt(limit));
    const totalPages = Math.ceil(activityDetails.length / parseInt(limit));

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalActivities,
          totalEmails,
          totalCalls,
          totalConnectedCalls,
          notConnectedCalls: totalCalls - totalConnectedCalls,
          uniqueLeadsContacted,
          avgCallDuration,
          connectionRate: totalCalls > 0 ? ((totalConnectedCalls / totalCalls) * 100).toFixed(1) : '0',
          totalOpenedEmails,
          totalBouncedEmails,
          openRate
        },
        userSummaries: Object.values(activitiesByUser).map(user => ({
          userId: user.userId,
          userName: user.userName,
          userEmail: user.userEmail,
          totalActivities: user.totalActivities,
          totalEmails: user.totalEmails,
          totalCalls: user.totalCalls,
          connectedCalls: user.connectedCalls,
          notConnectedCalls: user.notConnectedCalls,
          uniqueLeadsContacted: user.uniqueLeadsContacted,
          avgCallDuration: user.totalCalls > 0 ? (user.totalCallDuration / user.totalCalls).toFixed(1) : '0',
          openedEmails: user.openedEmails,
          bouncedEmails: user.bouncedEmails,
          openRate: user.totalEmails > 0 ? ((user.openedEmails / user.totalEmails) * 100).toFixed(1) : '0'
        })),
        activities: paginatedActivities,
        dailyActivities,
        openedEmails: openedEmailsList,
        bouncedEmails: bouncedEmailsList
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount: activityDetails.length,
        limit: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error in getSalespersonActivities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching salesperson activities',
      error: error.message
    });
  }
};

const getUserActivitiesWithConversations = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      startDate = '',
      endDate = '',
      activityType = 'all'
    } = req.query;

    const dateConditions = {};
    let hasDateFilter = false;

    if (startDate) {
      const startDateObj = new Date(startDate);
      if (!isNaN(startDateObj.getTime())) {
        dateConditions.$gte = startDateObj;
        hasDateFilter = true;
      }
    }
    
    if (endDate) {
      const endDateObj = new Date(endDate);
      if (!isNaN(endDateObj.getTime())) {
        dateConditions.$lte = endDateObj;
        hasDateFilter = true;
      }
    }

    let conversationsQuery = {};

    if (activityType === 'email') {
      conversationsQuery.type = 'email_thread';
      if (hasDateFilter) {
        conversationsQuery.$or = [
          { last_message_date: dateConditions },
          { first_message_date: dateConditions }
        ];
      }
    } else if (activityType === 'call') {
      conversationsQuery.type = 'phone';
      if (hasDateFilter) {
        conversationsQuery.created_at = dateConditions;
      }
    } else if (hasDateFilter) {
      conversationsQuery.created_at = dateConditions;
    }

    const conversations = await Conversation.find(conversationsQuery)
      .sort({ created_at: -1 })
      .limit(1000)
      .lean();

    const userConversations = conversations.filter(conv => {
      if (conv.type === 'phone' && conv.user_details?.id == userId) {
        return true;
      }
      if (conv.type === 'email_thread' && conv.messages) {
        const hasUserMessage = conv.messages.some(m => 
          m.direction === 'outgoing' && m.sender?.id == userId && !isAutomatedEmail(m)
        );
        return hasUserMessage;
      }
      return false;
    });

    const contactIds = [...new Set(userConversations.map(c => c.contact_id))];
    const contacts = await Contact.find({ id: { $in: contactIds } }).lean();
    
    const contactMap = {};
    contacts.forEach(contact => {
      contactMap[contact.id] = contact;
    });

    const enhancedConversations = userConversations.map(conv => {
      const contact = contactMap[conv.contact_id];
      return {
        ...conv,
        contact_info: contact ? {
          id: contact.id,
          display_name: contact.display_name,
          email: contact.email,
          company: contact.custom_field?.cf_company_name,
          country: contact.country,
          territory: contact.territory_name,
          market_name: contact.custom_field?.cf_report_name
        } : null
      };
    });

    res.json({
      success: true,
      data: enhancedConversations
    });

  } catch (error) {
    console.error('Error in getUserActivitiesWithConversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user activities',
      error: error.message
    });
  }
};

const getUserDayActivities = async (req, res) => {
  try {
    const { userId, date } = req.params;

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const conversations = await Conversation.find({
      created_at: {
        $gte: startDate,
        $lte: endDate
      }
    }).lean();

    const userConversations = conversations.filter(conv => {
      if (conv.type === 'phone' && conv.user_details?.id == userId) {
        return true;
      }
      if (conv.type === 'email_thread' && conv.messages) {
        const outgoingMsg = conv.messages.find(m => 
          m.direction === 'outgoing' && m.sender?.id == userId
        );
        return !!outgoingMsg;
      }
      return false;
    });

    const contactIds = [...new Set(userConversations.map(c => c.contact_id))];
    const contacts = await Contact.find({ id: { $in: contactIds } }).lean();
    const contactMap = {};
    contacts.forEach(contact => {
      contactMap[contact.id] = contact;
    });

    const activities = userConversations.map(conv => {
      const contact = contactMap[conv.contact_id];
      return {
        activityTime: conv.created_at,
        activityType: conv.type === 'email_thread' ? 'Email' : 'Call',
        contactName: contact?.display_name || 'Unknown',
        contactEmail: contact?.email,
        contactCountry: contact?.country,
        marketName: contact?.custom_field?.cf_report_name || 'NA',
        subject: conv.subject,
        callDuration: conv.call_duration || 0,
        isConnected: conv.call_duration > 90,
        conversationId: conv.conversation_id
      };
    }).sort((a, b) => new Date(b.activityTime) - new Date(a.activityTime));

    res.json({
      success: true,
      data: activities
    });

  } catch (error) {
    console.error('Error in getUserDayActivities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user day activities',
      error: error.message
    });
  }
};

module.exports = {
  getSalespersonActivities,
  getUserActivitiesWithConversations,
  getUserDayActivities
};