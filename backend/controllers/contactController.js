const Contact = require('../models/Contact');
const Conversation = require('../models/Conversation');

const getContactsTable = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search = '',
      startDate = '',
      endDate = '',
      analyticsCountryFilter = '[]'
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
      status: parseFilter(req.query.status),
      owner: parseFilter(req.query.owner),
      territory: parseFilter(req.query.territory),
      leadLevel: parseFilter(req.query.leadLevel),
      contactCategory: parseFilter(req.query.contactCategory),
      customTags: parseFilter(req.query.customTags),
      country: parseFilter(req.query.country),
      isActive: req.query.isActive || ''
    };

    const analyticsCountries = parseFilter(analyticsCountryFilter);
    console.log('Analytics country filter received:', analyticsCountries);
    
    const query = {};

    if (search) {
      query.$or = [
        { display_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile_number: { $regex: search, $options: 'i' } },
        { 'custom_field.cf_company_name': { $regex: search, $options: 'i' } },
        { 'custom_field.cf_report_name': { $regex: search, $options: 'i' } }
      ];
    }

    // Helper function to build multi-select filter
    const buildMultiSelectFilter = (fieldPath, values) => {
      if (!values || values.length === 0) return null;
      
      const standardValues = [];
      const unassignedValues = [];
      
      values.forEach(value => {
        if (value.startsWith('Unassigned')) {
          unassignedValues.push(value);
        } else {
          standardValues.push(value);
        }
      });

      const conditions = [];
      
      if (standardValues.length > 0) {
        conditions.push({ [fieldPath]: { $in: standardValues } });
      }
      
      if (unassignedValues.length > 0) {
        conditions.push({
          $or: [
            { [fieldPath]: { $exists: false } },
            { [fieldPath]: null },
            { [fieldPath]: '' },
            { [fieldPath]: '-' },
            { [fieldPath]: 'NA' },
            { [fieldPath]: 'na' },
            { [fieldPath]: 'N/A' },
            { [fieldPath]: 'n/a' }
          ]
        });
      }
      
      return conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : { $or: conditions }) : null;
    };

    // Add multi-select filters
    const statusFilter = buildMultiSelectFilter('status_name', filters.status);
    if (statusFilter) {
      query.$and = query.$and || [];
      query.$and.push(statusFilter);
    }

    const ownerFilter = buildMultiSelectFilter('owner_name', filters.owner);
    if (ownerFilter) {
      query.$and = query.$and || [];
      query.$and.push(ownerFilter);
    }

    const territoryFilter = buildMultiSelectFilter('territory_name', filters.territory);
    if (territoryFilter) {
      query.$and = query.$and || [];
      query.$and.push(territoryFilter);
    }

    const leadLevelFilter = buildMultiSelectFilter('custom_field.cf_lead_level', filters.leadLevel);
    if (leadLevelFilter) {
      query.$and = query.$and || [];
      query.$and.push(leadLevelFilter);
    }

    const contactCategoryFilter = buildMultiSelectFilter('custom_field.cf_contact_category', filters.contactCategory);
    if (contactCategoryFilter) {
      query.$and = query.$and || [];
      query.$and.push(contactCategoryFilter);
    }

    const customTagsFilter = buildMultiSelectFilter('custom_field.cf_custom_tags', filters.customTags);
    if (customTagsFilter) {
      query.$and = query.$and || [];
      query.$and.push(customTagsFilter);
    }

    const countryFilter = buildMultiSelectFilter('country', filters.country);
    if (countryFilter) {
      query.$and = query.$and || [];
      query.$and.push(countryFilter);
    }

    if (filters.isActive) {
      query.$and = query.$and || [];
      
      if (filters.isActive === 'yes') {
        query.$and.push({
          $or: [
            { 'crm_analytics.engagement.incoming_emails': { $gt: 0 } },
            { 'crm_analytics.engagement.connected_calls': { $gt: 0 } }
          ]
        });
      } else if (filters.isActive === 'no') {
        query.$and.push({
          $and: [
            { 
              $or: [
                { 'crm_analytics.engagement.incoming_emails': { $exists: false } },
                { 'crm_analytics.engagement.incoming_emails': 0 }
              ]
            },
            { 
              $or: [
                { 'crm_analytics.engagement.connected_calls': { $exists: false } },
                { 'crm_analytics.engagement.connected_calls': 0 }
              ]
            }
          ]
        });
      }
    }

    query['custom_field.cf_report_name'] = { 
      $exists: true, 
      $ne: null, 
      $ne: '', 
      $ne: '-',
      $ne: 'NA',
      $ne: 'na',
      $ne: 'N/A',
      $ne: 'n/a',
      $nin: [null, '', '-', 'NA', 'na', 'N/A', 'n/a', undefined]
    };

    // Add date range filter with proper timezone handling
    if (startDate || endDate) {
      query.$expr = query.$expr || { $and: [] };
      if (!Array.isArray(query.$expr.$and)) {
        query.$expr.$and = [];
      }
      
      if (startDate) {
        const startDateObj = new Date(startDate);
        console.log('Original startDate:', startDate);
        console.log('Parsed startDate:', startDateObj);
        
        query.$expr.$and.push({
          $gte: [
            { $dateFromString: { dateString: "$created_at" } },
            startDateObj
          ]
        });
      }
      
      if (endDate) {
        const endDateObj = new Date(endDate);
        console.log('Original endDate:', endDate);
        console.log('Parsed endDate:', endDateObj);
        
        query.$expr.$and.push({
          $lte: [
            { $dateFromString: { dateString: "$created_at" } },
            endDateObj
          ]
        });
      }
    }

    console.log('Final MongoDB query:', JSON.stringify(query, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await Contact.countDocuments(query);
    console.log('Total count found:', totalCount);

    let dbSortField = sortBy;
    if (sortBy === 'market_name') {
      dbSortField = 'custom_field.cf_report_name';
    } else if (sortBy === 'lead_level') {
      dbSortField = 'custom_field.cf_lead_level';
    } else if (sortBy === 'company') {
      dbSortField = 'custom_field.cf_company_name';
    } else if (sortBy === 'territory') {
      dbSortField = 'territory_name';
    } else if (sortBy === 'contact_category') {
      dbSortField = 'custom_field.cf_contact_category';
    } else if (sortBy === 'custom_tags') {
      dbSortField = 'custom_field.cf_custom_tags';
    } else if (sortBy === 'is_active') {
      dbSortField = 'crm_analytics.engagement.incoming_emails';
    } else if (sortBy === 'sample_sent_timing') {
      dbSortField = 'crm_analytics.first_email_with_attachment.date';
    } else if (sortBy === 'last_email_received') {
      dbSortField = 'crm_analytics.last_email_received.date';
    } else if (sortBy === 'first_email_with_attachment') {
      dbSortField = 'crm_analytics.first_email_with_attachment.date';
    } else if (sortBy === 'total_touchpoints') {
      dbSortField = 'crm_analytics.engagement.total_touchpoints';
    } else if (sortBy === 'outgoing_emails') {
      dbSortField = 'crm_analytics.engagement.outgoing_emails';
    } else if (sortBy === 'incoming_emails') {
      dbSortField = 'crm_analytics.engagement.incoming_emails';
    } else if (sortBy === 'outgoing_calls') {
      dbSortField = 'crm_analytics.engagement.outgoing_calls';
    } else if (sortBy === 'connected_calls') {
      dbSortField = 'crm_analytics.engagement.connected_calls';
    } else if (sortBy === 'not_connected_calls') {
      dbSortField = 'crm_analytics.engagement.not_connected_calls';
    } else if (sortBy === 'call_duration_total') {
      dbSortField = 'crm_analytics.engagement.avg_connected_call_duration';
    } else if (sortBy === 'first_call_timing') {
      dbSortField = 'crm_analytics.first_call.date';
    }

    const contacts = await Contact.find(query)
      .select('id display_name email country job_title custom_field owner_name created_at last_contacted last_contacted_mode status_name territory_name crm_analytics')
      .sort({ [dbSortField]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log('Contacts found:', contacts.length);
    if (contacts.length > 0) {
      console.log('Sample contact market names:', contacts.slice(0, 3).map(c => ({
        name: c.display_name,
        market_name: c.custom_field?.cf_report_name,
        created_at: c.created_at,
        territory_name: c.territory_name,
        country: c.country,
        contact_category: c.custom_field?.cf_contact_category
      })));
    }

    // Helper function to format field values
    const formatValue = (value) => {
      if (!value || value === null || value === undefined || value === '' || value === '-') {
        return 'NA';
      }
      return value;
    };

    // Helper function to format duration in minutes and seconds
    const formatDuration = (seconds) => {
      if (!seconds || seconds === 0) return '0m 0s';
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    };

    // Helper function to determine if contact is active
    const isContactActive = (contact) => {
      const incomingEmails = contact.crm_analytics?.engagement?.incoming_emails || 0;
      const connectedCalls = contact.crm_analytics?.engagement?.connected_calls || 0;
      return incomingEmails > 0 || connectedCalls > 0;
    };

    // Helper function to calculate sample sent timing for individual contact
    const calculateSampleSentTiming = (contact) => {
      if (!contact.created_at || !contact.crm_analytics?.first_email_with_attachment?.date) {
        return null;
      }
      
      const createdDate = new Date(contact.created_at);
      const sampleDate = new Date(contact.crm_analytics.first_email_with_attachment.date);
      
      if (sampleDate > createdDate) {
        const hoursDelay = (sampleDate - createdDate) / (1000 * 60 * 60);
        return hoursDelay >= 0 && hoursDelay <= 8760 ? hoursDelay.toFixed(1) : null;
      }
      return null;
    };

    const calculateFirstCallTiming = (contact) => {
      if (!contact.created_at || !contact.crm_analytics?.first_call?.date) {
        return null;
      }
      
      const createdDate = new Date(contact.created_at);
      const firstCallDate = new Date(contact.crm_analytics.first_call.date);
      
      if (firstCallDate > createdDate) {
        const minutesDelay = (firstCallDate - createdDate) / (1000 * 60);
        return minutesDelay >= 0 && minutesDelay <= 525600 ? minutesDelay.toFixed(1) : null; 
      }
      return null;
    };

    const tableData = contacts
      .filter(contact => {
        const marketName = contact.custom_field?.cf_report_name;
        return marketName && 
              marketName !== '-' && 
              marketName !== '' && 
              marketName !== 'NA' && 
              marketName !== 'na' && 
              marketName !== 'N/A' && 
              marketName !== 'n/a';
      })
      .map(contact => ({
        id: contact.id,
        market_name: contact.custom_field?.cf_report_name || 'NA',
        display_name: formatValue(contact.display_name),
        email: formatValue(contact.email),
        company: formatValue(contact.custom_field?.cf_company_name),
        country: formatValue(contact.country),
        job_title: formatValue(contact.job_title),
        territory: formatValue(contact.territory_name),
        lead_level: formatValue(contact.custom_field?.cf_lead_level),
        contact_category: formatValue(contact.custom_field?.cf_contact_category),
        custom_tags: formatValue(contact.custom_field?.cf_custom_tags),
        is_active: isContactActive(contact) ? 'Yes' : 'No',
        sample_sent_timing: calculateSampleSentTiming(contact),
        first_call_timing: calculateFirstCallTiming(contact),
        status_name: formatValue(contact.status_name),
        owner_name: formatValue(contact.owner_name),
        created_at: contact.created_at,
        last_contacted_mode: formatValue(contact.last_contacted_mode),
        last_contacted_time: contact.last_contacted || null,
        
        // CRM Analytics fields
        last_email_received: contact.crm_analytics?.last_email_received?.date || null,
        first_email_with_attachment: contact.crm_analytics?.first_email_with_attachment?.date || null,
        first_call_date: contact.crm_analytics?.first_call?.date || null,
        total_touchpoints: contact.crm_analytics?.engagement?.total_touchpoints || 0,
        outgoing_emails: contact.crm_analytics?.engagement?.outgoing_emails || 0,
        incoming_emails: contact.crm_analytics?.engagement?.incoming_emails || 0,
        outgoing_calls: contact.crm_analytics?.engagement?.outgoing_calls || 0,
        connected_calls: contact.crm_analytics?.engagement?.connected_calls || 0,
        not_connected_calls: contact.crm_analytics?.engagement?.not_connected_calls || 0,
        avg_connected_call_duration: contact.crm_analytics?.engagement?.avg_connected_call_duration || 0,
        avg_connected_call_duration_formatted: formatDuration(contact.crm_analytics?.engagement?.avg_connected_call_duration || 0)
      }));

    const allFilteredContacts = await Contact.find(query)
      .select('custom_field crm_analytics created_at country territory_name')
      .lean();

    const calculateEnhancedAnalytics = (contacts, analyticsCountries) => {
      if (!contacts || contacts.length === 0) {
        return {
          totalContacts: 0,
          avgTouchpoints: '0.0',
          avgEmails: '0.0',
          avgCalls: '0.0',
          avgConnectedCalls: '0.0',
          avgSampleSentHours: '0.0',
          avgFirstCallMinutes: '0.0',
          clientEmailsReceived: 0,
          avgCallDuration: '0',
          avgConnectedCallDuration: '0',
          responseRate: '0.0',
          samplesSentCount: 0,
          firstCallsCount: 0,
          countryBreakdown: {},
          territoryBreakdown: {},
          activeLeadCount: 0,
          leadLevelBreakdown: {},
          contactCategoryBreakdown: {},
          priorityCountries: {}
        };
      }

  let analyticsContacts = contacts;
  if (analyticsCountries && analyticsCountries.length > 0) {
    console.log('Filtering analytics by countries:', analyticsCountries);
    analyticsContacts = contacts.filter(contact => 
      analyticsCountries.includes(contact.country)
    );
    console.log('Analytics contacts after country filter:', analyticsContacts.length);
  }

  let totalTouchpoints = 0;
  let totalOutgoingEmails = 0;
  let totalOutgoingCalls = 0;
  let totalIncomingEmails = 0;
  let totalConnectedCalls = 0;
  let totalSampleSentHours = 0;
  let totalFirstCallMinutes = 0;
  let validSampleSentCount = 0;
  let validFirstCallCount = 0;
  let totalCallDuration = 0;
  let totalConnectedCallDuration = 0; 
  let validCallDurationCount = 0;
  let validConnectedCallDurationCount = 0; 
  let contactsWithCalls = 0;
  let activeLeadCount = 0;

  const countryBreakdown = {};
  const territoryBreakdown = {};
  const leadLevelBreakdown = {};
  const contactCategoryBreakdown = {};
  const priorityCountries = {};

  const priorityCountryList = [
    'United States', 'United Kingdom', 'France', 'Italy', 
    'Germany', 'Spain', 'Japan', 'Korea, Republic of'
  ];
  priorityCountryList.forEach(country => {
    priorityCountries[country] = 0;
  });

  contacts.forEach(contact => {
    const country = contact.country || 'Unknown';
    countryBreakdown[country] = (countryBreakdown[country] || 0) + 1;
    
    if (priorityCountries.hasOwnProperty(country)) {
      priorityCountries[country]++;
    }

    // Territory breakdown
    const territory = contact.territory_name || 'Unassigned';
    territoryBreakdown[territory] = (territoryBreakdown[territory] || 0) + 1;

    // Lead level breakdown
    const leadLevel = contact.custom_field?.cf_lead_level || 'Unassigned';
    leadLevelBreakdown[leadLevel] = (leadLevelBreakdown[leadLevel] || 0) + 1;

    const contactCategory = contact.custom_field?.cf_contact_category || 'Unassigned';
    contactCategoryBreakdown[contactCategory] = (contactCategoryBreakdown[contactCategory] || 0) + 1;
  });

  analyticsContacts.forEach(contact => {
    if (contact.crm_analytics?.engagement) {
      const engagement = contact.crm_analytics.engagement;
      
      const emailTouchpoints = (engagement.outgoing_emails || 0) + (engagement.incoming_emails || 0);
      const callTouchpoints = (engagement.outgoing_calls || 0) + (engagement.incoming_calls || 0);
      
      totalTouchpoints += emailTouchpoints + callTouchpoints;
      totalOutgoingEmails += engagement.outgoing_emails || 0;
      totalOutgoingCalls += engagement.outgoing_calls || 0;
      
      const connectedCalls = engagement.connected_calls || 0;
      totalConnectedCalls += connectedCalls;
      
      if ((engagement.outgoing_calls || 0) > 0) {
        contactsWithCalls++;
      }
      
      totalIncomingEmails += engagement.incoming_emails || 0;
      
      if (engagement.call_duration_total && engagement.call_duration_total > 0) {
        totalCallDuration += engagement.call_duration_total;
        validCallDurationCount++;
      }

      if (engagement.avg_connected_call_duration && engagement.avg_connected_call_duration > 0 && connectedCalls > 0) {
        totalConnectedCallDuration += engagement.avg_connected_call_duration * connectedCalls;
        validConnectedCallDurationCount += connectedCalls;
      } else if (engagement.call_duration_total && engagement.call_duration_total > 0 && connectedCalls > 0) {
        totalConnectedCallDuration += engagement.call_duration_total;
        validConnectedCallDurationCount += connectedCalls;
      }
      if ((engagement.incoming_emails || 0) > 0 || connectedCalls > 0) {
        activeLeadCount++;
      }
    }
    
    if (contact.created_at && contact.crm_analytics?.first_email_with_attachment?.date) {
      const createdDate = new Date(contact.created_at);
      const sampleSentDate = new Date(contact.crm_analytics.first_email_with_attachment.date);
      
      if (sampleSentDate > createdDate) {
        const hoursDelay = (sampleSentDate - createdDate) / (1000 * 60 * 60);
        if (hoursDelay >= 0 && hoursDelay <= 8760) { 
          totalSampleSentHours += hoursDelay;
          validSampleSentCount++;
        }
      }
    }

    if (contact.created_at && contact.crm_analytics?.first_call?.date) {
      const createdDate = new Date(contact.created_at);
      const firstCallDate = new Date(contact.crm_analytics.first_call.date);
      
      if (firstCallDate > createdDate) {
        const minutesDelay = (firstCallDate - createdDate) / (1000 * 60);
        if (minutesDelay >= 0 && minutesDelay <= 525600) { 
          totalFirstCallMinutes += minutesDelay;
          validFirstCallCount++;
        }
      }
    }
  });

  // Calculate response rate
  const responseRate = totalOutgoingEmails > 0 ? (totalIncomingEmails / totalOutgoingEmails) * 100 : 0;

  return {
    totalContacts: analyticsContacts.length,
    avgTouchpoints: analyticsContacts.length > 0 ? (totalTouchpoints / analyticsContacts.length).toFixed(1) : '0.0',
    avgEmails: analyticsContacts.length > 0 ? (totalOutgoingEmails / analyticsContacts.length).toFixed(1) : '0.0',
    avgCalls: analyticsContacts.length > 0 ? (totalOutgoingCalls / analyticsContacts.length).toFixed(1) : '0.0',
    avgConnectedCalls: contactsWithCalls > 0 ? (totalConnectedCalls / contactsWithCalls).toFixed(1) : '0.0',
    avgSampleSentHours: validSampleSentCount > 0 ? (totalSampleSentHours / validSampleSentCount).toFixed(1) : '0.0',
    avgFirstCallMinutes: validFirstCallCount > 0 ? (totalFirstCallMinutes / validFirstCallCount).toFixed(1) : '0.0',
    clientEmailsReceived: totalIncomingEmails,
    avgCallDuration: validCallDurationCount > 0 ? (totalCallDuration / validCallDurationCount).toFixed(0) : '0',
    avgConnectedCallDuration: validConnectedCallDurationCount > 0 ? (totalConnectedCallDuration / validConnectedCallDurationCount).toFixed(0) : '0',
    responseRate: responseRate.toFixed(1),
    samplesSentCount: validSampleSentCount,
    firstCallsCount: validFirstCallCount,
    countryBreakdown,
    territoryBreakdown,
    activeLeadCount, 
    leadLevelBreakdown,
    contactCategoryBreakdown,
    priorityCountries
  };
};

    const analytics = calculateEnhancedAnalytics(allFilteredContacts, analyticsCountries);

    // Calculate pagination metadata based on filtered results
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: tableData,
      analytics: analytics,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error in getContactsTable:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts table data',
      error: error.message
    });
  }
};

// Enhanced getContactConversations 
const getContactConversations = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    const isValidObjectId = (id) => {
      return /^[0-9a-fA-F]{24}$/.test(id);
    };

    let contactQuery;
    if (isValidObjectId(id)) {
      contactQuery = {
        $or: [
          { _id: id },
          { id: parseInt(id) }
        ]
      };
    } else {
      contactQuery = { id: parseInt(id) };
    }

    const contact = await Contact.findOne(contactQuery).select('id display_name created_at');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    const query = { contact_id: contact.id };
    if (type) {
      query.type = type;
    }

    const conversations = await Conversation.find(query)
      .sort({ 
        created_at: -1,  
        updated_at: -1   
      })
      .lean();

    const enhancedConversations = conversations.map(conversation => {
      const enhanced = { ...conversation };

      if (conversation.type === 'email_thread' && conversation.messages) {
        enhanced.messages = conversation.messages.sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );

        const stats = {
          outgoing_messages: enhanced.messages.filter(msg => msg.direction === 'outgoing').length,
          incoming_messages: enhanced.messages.filter(msg => msg.direction === 'incoming').length,
          total_attachments: enhanced.messages.reduce((total, msg) => 
            total + (msg.attachments ? msg.attachments.length : 0), 0),
          needs_response: false 
        };

        if (enhanced.messages.length > 0) {
          const sortedMessages = enhanced.messages.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
          );
          const lastMessage = sortedMessages[0];
          
          if (lastMessage.direction === 'outgoing') {
            const daysSinceLastMessage = (new Date() - new Date(lastMessage.timestamp)) / (1000 * 60 * 60 * 24);
            stats.needs_response = daysSinceLastMessage > 2;
          }
        }

        enhanced.stats = stats;

        const messageDates = enhanced.messages.map(msg => new Date(msg.timestamp));
        enhanced.first_message_date = new Date(Math.min(...messageDates)).toISOString();
        enhanced.last_message_date = new Date(Math.max(...messageDates)).toISOString();

        enhanced.sort_date = enhanced.last_message_date;
      } else {
        enhanced.sort_date = conversation.created_at;
      }

      if (conversation.type === 'phone') {
        enhanced.call_status = (conversation.call_duration || 0) > 90 ? 'connected' : 'not_connected';
        enhanced.call_duration_formatted = formatDuration(conversation.call_duration || 0);
        enhanced.is_connected = (conversation.call_duration || 0) > 90;
      }

      return enhanced;
    });

    enhancedConversations.sort((a, b) => {
      const dateA = new Date(a.sort_date || a.created_at);
      const dateB = new Date(b.sort_date || b.created_at);
      return dateB - dateA; 
    });

    console.log(`Found ${enhancedConversations.length} conversations for contact ${contact.id}`);
    
    console.log('Conversation order:', enhancedConversations.map(c => ({
      id: c.conversation_id,
      type: c.type,
      sort_date: c.sort_date || c.created_at,
      subject: c.subject || 'No subject'
    })));

    res.json({
      success: true,
      data: enhancedConversations,
      contact_info: {
        id: contact.id,
        name: contact.display_name,
        created_at: contact.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
      error: error.message
    });
  }
};

const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0m 0s';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const getAllContacts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search = '',
      startDate = '',
      endDate = ''
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
      status: parseFilter(req.query.status),
      owner: parseFilter(req.query.owner),
      country: parseFilter(req.query.country)
    };

    const query = {};

    if (search) {
      query.$or = [
        { display_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile_number: { $regex: search, $options: 'i' } },
        { 'custom_field.cf_company_name': { $regex: search, $options: 'i' } },
        { 'custom_field.cf_report_name': { $regex: search, $options: 'i' } }
      ];
    }

    if (filters.status.length > 0) {
      query.status_name = { $in: filters.status };
    }
    
    if (filters.owner.length > 0) {
      query.owner_name = { $in: filters.owner };
    }

    if (filters.country.length > 0) {
      query.country = { $in: filters.country };
    }

    query['custom_field.cf_report_name'] = { 
      $exists: true, 
      $ne: null, 
      $ne: '', 
      $ne: '-',
      $ne: 'NA',
      $ne: 'na',
      $ne: 'N/A',
      $ne: 'n/a',
      $nin: [null, '', '-', 'NA', 'na', 'N/A', 'n/a', undefined]
    };

    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) query.created_at.$gte = new Date(startDate);
      if (endDate) query.created_at.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await Contact.countDocuments(query);

    const contacts = await Contact.find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: contacts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts',
      error: error.message
    });
  }
};

const getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeConversations = 'false' } = req.query;
    
    const isValidObjectId = (id) => {
      return /^[0-9a-fA-F]{24}$/.test(id);
    };

    let contactQuery;
    if (isValidObjectId(id)) {
      contactQuery = {
        $or: [
          { _id: id },
          { id: parseInt(id) }
        ]
      };
    } else {
      contactQuery = { id: parseInt(id) };
    }

    const contact = await Contact.findOne(contactQuery);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    if (includeConversations === 'true') {
      const conversations = await Conversation.find({ 
        contact_id: contact.id 
      }).sort({ created_at: -1 });
      
      return res.json({
        success: true,
        data: conversations
      });
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching contact',
      error: error.message
    });
  }
};

const getContactStats = async (req, res) => {
  try {
    const marketNameFilter = {
      'custom_field.cf_report_name': { 
        $exists: true, 
        $ne: null, 
        $ne: '', 
        $ne: '-',
        $ne: 'NA',
        $ne: 'na',
        $ne: 'N/A',
        $ne: 'n/a',
        $nin: [null, '', '-', 'NA', 'na', 'N/A', 'n/a', undefined]
      }
    };

    const stats = await Contact.aggregate([
      { $match: marketNameFilter },
      {
        $group: {
          _id: null,
          totalContacts: { $sum: 1 },
          avgLeadScore: { $avg: '$lead_score' },
          totalOpenDeals: { $sum: '$open_deals_count' },
          totalWonDeals: { $sum: '$won_deals_count' },
          contactsWithEmail: {
            $sum: { $cond: [{ $ne: ['$email', null] }, 1, 0] }
          },
          contactsWithPhone: {
            $sum: { $cond: [{ $ne: ['$mobile_number', null] }, 1, 0] }
          }
        }
      }
    ]);

    const statusDistribution = await Contact.aggregate([
      { $match: marketNameFilter },
      {
        $group: {
          _id: '$status_name',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const ownerDistribution = await Contact.aggregate([
      { $match: marketNameFilter },
      {
        $group: {
          _id: '$owner_name',
          count: { $sum: 1 },
          avgLeadScore: { $avg: '$lead_score' },
          totalOpenDeals: { $sum: '$open_deals_count' },
          totalWonDeals: { $sum: '$won_deals_count' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 } 
    ]);

    const territoryDistribution = await Contact.aggregate([
      { $match: marketNameFilter },
      {
        $group: {
          _id: '$territory_name',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const callStats = await Conversation.aggregate([
      { $match: { type: 'phone' } },
      {
        $lookup: {
          from: 'contacts',
          localField: 'contact_id',
          foreignField: 'id',
          as: 'contact'
        }
      },
      { $unwind: '$contact' },
      { $match: { 'contact.custom_field.cf_report_name': { $exists: true, $ne: null, $ne: '', $ne: '-' } } },
      {
        $group: {
          _id: null,
          avgCallDuration: { $avg: '$call_duration' },
          totalCalls: { $sum: 1 },
          answeredCalls: {
            $sum: {
              $cond: [
                { $gt: ['$call_duration', 90] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivityStats = await Contact.aggregate([
      { 
        $match: {
          ...marketNameFilter,
          last_contacted: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$last_contacted_mode',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalContacts: 0,
          avgLeadScore: 0,
          totalOpenDeals: 0,
          totalWonDeals: 0,
          contactsWithEmail: 0,
          contactsWithPhone: 0
        },
        statusDistribution,
        ownerDistribution,
        territoryDistribution, 
        callStats: callStats[0] || {
          avgCallDuration: 0,
          totalCalls: 0,
          answeredCalls: 0
        },
        recentActivityStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching contact statistics',
      error: error.message
    });
  }
};

const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

const buildContactQuery = (id) => {
  if (isValidObjectId(id)) {
    return {
      $or: [
        { _id: id },
        { id: parseInt(id) }
      ]
    };
  } else {
    return { id: parseInt(id) };
  }
};

const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const contact = await Contact.findOneAndUpdate(
      buildContactQuery(id),
      updates,
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: contact,
      message: 'Contact updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating contact',
      error: error.message
    });
  }
};

const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    
    const contact = await Contact.findOneAndDelete(buildContactQuery(id));

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    await Conversation.deleteMany({ contact_id: contact.id });

    res.json({
      success: true,
      message: 'Contact and related conversations deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting contact',
      error: error.message
    });
  }
};

const getFilterOptions = async (req, res) => {
  try {
    const marketNameFilter = {
      'custom_field.cf_report_name': { 
        $exists: true, 
        $ne: null, 
        $ne: '', 
        $ne: '-',
        $ne: 'NA',
        $ne: 'na',
        $ne: 'N/A',
        $ne: 'n/a',
        $nin: [null, '', '-', 'NA', 'na', 'N/A', 'n/a', undefined]
      }
    };

    const [statuses, owners, territories, leadLevels, contactCategories, customTags, countries] = await Promise.all([
      Contact.distinct('status_name', marketNameFilter),
      Contact.distinct('owner_name', marketNameFilter),
      Contact.distinct('territory_name', marketNameFilter),
      Contact.distinct('custom_field.cf_lead_level', marketNameFilter),
      Contact.distinct('custom_field.cf_contact_category', marketNameFilter),
      Contact.distinct('custom_field.cf_custom_tags', marketNameFilter),
      Contact.distinct('country', marketNameFilter)
    ]);

    console.log('Raw contact categories from database:', contactCategories);

    const filterNA = (values) => values.filter(val => 
      val && 
      val !== null && 
      val !== '' && 
      val !== '-' && 
      val !== 'NA' && 
      val !== 'na' && 
      val !== 'N/A' && 
      val !== 'n/a'
    );

    const [
      unassignedOwnerCount, 
      unassignedTerritoryCount, 
      unassignedLeadLevelCount, 
      unassignedContactCategoryCount, 
      unassignedCustomTagsCount,
      unassignedCountryCount
    ] = await Promise.all([
      Contact.countDocuments({
        ...marketNameFilter,
        $or: [
          { owner_name: { $exists: false } },
          { owner_name: null },
          { owner_name: '' },
          { owner_name: '-' },
          { owner_name: 'NA' },
          { owner_name: 'na' },
          { owner_name: 'N/A' },
          { owner_name: 'n/a' }
        ]
      }),
      Contact.countDocuments({
        ...marketNameFilter,
        $or: [
          { territory_name: { $exists: false } },
          { territory_name: null },
          { territory_name: '' },
          { territory_name: '-' },
          { territory_name: 'NA' },
          { territory_name: 'na' },
          { territory_name: 'N/A' },
          { territory_name: 'n/a' }
        ]
      }),
      Contact.countDocuments({
        ...marketNameFilter,
        $or: [
          { 'custom_field.cf_lead_level': { $exists: false } },
          { 'custom_field.cf_lead_level': null },
          { 'custom_field.cf_lead_level': '' },
          { 'custom_field.cf_lead_level': '-' },
          { 'custom_field.cf_lead_level': 'NA' },
          { 'custom_field.cf_lead_level': 'na' },
          { 'custom_field.cf_lead_level': 'N/A' },
          { 'custom_field.cf_lead_level': 'n/a' }
        ]
      }),
      Contact.countDocuments({
        ...marketNameFilter,
        $or: [
          { 'custom_field.cf_contact_category': { $exists: false } },
          { 'custom_field.cf_contact_category': null },
          { 'custom_field.cf_contact_category': '' },
          { 'custom_field.cf_contact_category': '-' },
          { 'custom_field.cf_contact_category': 'NA' },
          { 'custom_field.cf_contact_category': 'na' },
          { 'custom_field.cf_contact_category': 'N/A' },
          { 'custom_field.cf_contact_category': 'n/a' }
        ]
      }),
      Contact.countDocuments({
        ...marketNameFilter,
        $or: [
          { 'custom_field.cf_custom_tags': { $exists: false } },
          { 'custom_field.cf_custom_tags': null },
          { 'custom_field.cf_custom_tags': '' },
          { 'custom_field.cf_custom_tags': '-' },
          { 'custom_field.cf_custom_tags': 'NA' },
          { 'custom_field.cf_custom_tags': 'na' },
          { 'custom_field.cf_custom_tags': 'N/A' },
          { 'custom_field.cf_custom_tags': 'n/a' }
        ]
      }),
      Contact.countDocuments({
        ...marketNameFilter,
        $or: [
          { country: { $exists: false } },
          { country: null },
          { country: '' },
          { country: '-' },
          { country: 'NA' },
          { country: 'na' },
          { country: 'N/A' },
          { country: 'n/a' }
        ]
      })
    ]);

    const processedOwners = filterNA(owners);
    const processedTerritories = filterNA(territories);
    const processedLeadLevels = filterNA(leadLevels);
    const processedContactCategories = filterNA(contactCategories);
    const processedCustomTags = filterNA(customTags);
    const processedCountries = filterNA(countries).sort();

    console.log('Processed contact categories:', processedContactCategories);

    if (unassignedOwnerCount > 0) {
      processedOwners.unshift(`Unassigned (${unassignedOwnerCount})`);
    }
    
    if (unassignedTerritoryCount > 0) {
      processedTerritories.unshift(`Unassigned (${unassignedTerritoryCount})`);
    }
    
    if (unassignedLeadLevelCount > 0) {
      processedLeadLevels.unshift(`Unassigned (${unassignedLeadLevelCount})`);
    }

    if (unassignedContactCategoryCount > 0) {
      processedContactCategories.unshift(`Unassigned (${unassignedContactCategoryCount})`);
    }

    if (unassignedCustomTagsCount > 0) {
      processedCustomTags.unshift(`Unassigned (${unassignedCustomTagsCount})`);
    }

    if (unassignedCountryCount > 0) {
      processedCountries.unshift(`Unassigned (${unassignedCountryCount})`);
    }

    res.json({
      success: true,
      data: {
        statuses: filterNA(statuses),
        owners: processedOwners,
        territories: processedTerritories,
        leadLevels: processedLeadLevels,
        contactCategories: processedContactCategories,
        customTags: processedCustomTags,
        countries: processedCountries,
        activeStatus: ['Yes', 'No']
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching filter options',
      error: error.message
    });
  }
};
const getTimeSeriesData = async (req, res) => {
  try {
    const {
      chartType,
      timeFilter = 'monthly', 
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
      status: parseFilter(req.query.status),
      owner: parseFilter(req.query.owner),
      territory: parseFilter(req.query.territory),
      leadLevel: parseFilter(req.query.leadLevel),
      contactCategory: parseFilter(req.query.contactCategory),
      customTags: parseFilter(req.query.customTags),
      country: parseFilter(req.query.country),
      isActive: req.query.isActive || ''
    };

    const query = {};

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

    const applyFilter = (field, values) => {
      const filter = buildMultiSelectFilter(field, values);
      if (filter) {
        query.$and = query.$and || [];
        query.$and.push(filter);
      }
    };

    applyFilter('status_name', filters.status);
    applyFilter('owner_name', filters.owner);
    applyFilter('territory_name', filters.territory);
    applyFilter('custom_field.cf_lead_level', filters.leadLevel);
    applyFilter('custom_field.cf_contact_category', filters.contactCategory);
    applyFilter('custom_field.cf_custom_tags', filters.customTags);
    applyFilter('country', filters.country);

    if (filters.isActive) {
        query.$and = query.$and || [];
        const isActiveCondition = filters.isActive === 'yes' ? { $gt: 0 } : { $in: [0, null] };
        query.$and.push({
            $or: [
                { 'crm_analytics.engagement.incoming_emails': isActiveCondition },
                { 'crm_analytics.engagement.connected_calls': isActiveCondition }
            ]
        });
    }

    query['custom_field.cf_report_name'] = { $exists: true, $nin: [null, '', '-', 'NA', 'na', 'N/A', 'n/a'] };

    const robustDateFromString = (field) => ({
      $dateFromString: { dateString: field, onError: null, onNull: null }
    });

    const createdAtDate = robustDateFromString("$created_at");

    let timeRangeQuery = {};
    if (req.query.startDate || req.query.endDate) {
      timeRangeQuery = { $expr: { $and: [] } };
      if (req.query.startDate) {
        timeRangeQuery.$expr.$and.push({ $gte: [createdAtDate, new Date(req.query.startDate)] });
      }
      if (req.query.endDate) {
        timeRangeQuery.$expr.$and.push({ $lte: [createdAtDate, new Date(req.query.endDate)] });
      }
    } else {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      timeRangeQuery = { $expr: { $gte: [createdAtDate, twelveMonthsAgo] } };
    }

    const finalQuery = { $and: [query, timeRangeQuery] };
    
    let dateGrouping = {
        $dateToString: {
            format: timeFilter === 'daily' ? "%Y-%m-%d" : "%Y-%m",
            date: createdAtDate,
            onNull: "Unknown Date"
        }
    };

    let aggregationPipeline = [];

    switch (chartType) {
      case 'performanceByOwner':
        aggregationPipeline = [
          { $match: finalQuery },
          {
            $group: {
              _id: { period: dateGrouping, owner: { $ifNull: ["$owner_name", "Unassigned"] } },
              totalContacts: { $sum: 1 },
              activeLeads: {
                $sum: { $cond: [{ $or: [ { $gt: [{ $ifNull: ["$crm_analytics.engagement.incoming_emails", 0] }, 0] }, { $gt: [{ $ifNull: ["$crm_analytics.engagement.connected_calls", 0] }, 0] } ] }, 1, 0] }
              }
            }
          },
          {
            $group: {
              _id: "$_id.period",
              totalContacts: { $sum: "$totalContacts" },
              owners: { $push: { owner: "$_id.owner", contacts: "$totalContacts", activeLeads: "$activeLeads" } }
            }
          },
          { $sort: { "_id": 1 } }
        ];
        break;

    case 'avgTouchpointsByOwner':
        aggregationPipeline = [
          { $match: finalQuery },
          {
            $group: {
              _id: { period: dateGrouping, owner: { $ifNull: ["$owner_name", "Unassigned"] } },
              avgEmails: { $avg: { $ifNull: ["$crm_analytics.engagement.outgoing_emails", 0] } },
              avgCalls: { $avg: { $ifNull: ["$crm_analytics.engagement.outgoing_calls", 0] } }
            }
          },
          {
            $group: {
              _id: "$_id.period",
              owners: { $push: { owner: "$_id.owner", avgEmails: "$avgEmails", avgCalls: "$avgCalls" } }
            }
          },
          { $sort: { "_id": 1 } }
        ];
        break;

    case 'responseRateByOwner':
        aggregationPipeline = [
          { $match: finalQuery },
          {
            $group: {
              _id: { period: dateGrouping, owner: { $ifNull: ["$owner_name", "Unassigned"] } },
              totalOutgoing: { $sum: { $ifNull: ["$crm_analytics.engagement.outgoing_emails", 0] } },
              totalIncoming: { $sum: { $ifNull: ["$crm_analytics.engagement.incoming_emails", 0] } }
            }
          },
          { $addFields: { responseRate: { $cond: [{ $gt: ["$totalOutgoing", 0] }, { $multiply: [{ $divide: ["$totalIncoming", "$totalOutgoing"] }, 100] }, 0] } } },
          {
            $group: {
              _id: "$_id.period",
              owners: { $push: { owner: "$_id.owner", responseRate: "$responseRate" } }
            }
          },
          { $sort: { "_id": 1 } }
        ];
        break;

    case 'avgSampleTimingByOwner':
    case 'avgFirstCallTimingByOwner':
        const isSample = chartType === 'avgSampleTimingByOwner';
        const dateField = isSample ? "$crm_analytics.first_email_with_attachment.date" : "$crm_analytics.first_call.date";
        const timingField = isSample ? "sampleTiming" : "firstCallTiming";
        const divisor = isSample ? 3600000 : 60000;
        const validRange = isSample ? 8760 : 525600;

        aggregationPipeline = [
            { $match: finalQuery },
            {
                $addFields: {
                    endDate: robustDateFromString(dateField),
                    startDate: robustDateFromString("$created_at")
                }
            },
            {
                $addFields: {
                    [timingField]: {
                        $cond: {
                            if: { $and: ["$startDate", "$endDate", { $gte: ["$endDate", "$startDate"] }] },
                            then: { $divide: [{ $subtract: ["$endDate", "$startDate"] }, divisor] },
                            else: null
                        }
                    }
                }
            },
            { $match: { [timingField]: { $ne: null, $lte: validRange } } },
            {
                $group: {
                    _id: { period: dateGrouping, owner: { $ifNull: ["$owner_name", "Unassigned"] } },
                    avgTiming: { $avg: `$${timingField}` }
                }
            },
            {
                $group: {
                    _id: "$_id.period",
                    owners: { $push: { owner: "$_id.owner", avgTiming: "$avgTiming" } }
                }
            },
            { $sort: { "_id": 1 } }
        ];
        break;


      case 'leadLevelsByOwner':
      case 'contactCategories':
        const field = chartType === 'leadLevelsByOwner' ? "$custom_field.cf_lead_level" : "$custom_field.cf_contact_category";
        const key = chartType === 'leadLevelsByOwner' ? 'level' : 'category';
        
        const collectionName = chartType === 'leadLevelsByOwner' ? 'leadLevels' : 'contactCategories';

        aggregationPipeline = [
          { $match: finalQuery },
          {
            $group: {
              _id: { period: dateGrouping, item: { $ifNull: [field, "Unassigned"] } },
              count: { $sum: 1 }
            }
          },
          {
            $group: {
              _id: "$_id.period",
              [collectionName]: { $push: { [key]: "$_id.item", count: "$count" } }
            }
          },
          { $sort: { "_id": 1 } }
        ];
        break;

      case 'territoryDistribution':
        const topTerritories = await Contact.aggregate([
          { $match: query },
          { $group: { _id: { $ifNull: ["$territory_name", "Unassigned"] }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]);
        const topTerritoryNames = topTerritories.map(t => t._id);

        aggregationPipeline = [
          { $match: { ...finalQuery, territory_name: { $in: topTerritoryNames } } },
          {
            $group: {
              _id: { period: dateGrouping, territory: { $ifNull: ["$territory_name", "Unassigned"] } },
              count: { $sum: 1 }
            }
          },
          {
            $group: {
              _id: "$_id.period",
              territories: { $push: { territory: "$_id.territory", count: "$count" } }
            }
          },
          { $sort: { "_id": 1 } }
        ];
        break;


      default:
        return res.status(400).json({ success: false, message: 'Invalid chart type' });
    }

    const results = await Contact.aggregate(aggregationPipeline);

    const timeSeriesData = [];
    const dynamicKeys = {
      owners: new Set(),
      territories: new Set(),
      leadLevels: new Set(),
      contactCategories: new Set()
    };
    
    results.forEach(result => {
      if (result._id === "Unknown Date") return;

      const period = result._id;
      const dataPoint = { period };

      const processGroup = (group, keyName, valueKey, prefix) => {
          result[group]?.forEach(item => {
              const key = item[keyName];
              dynamicKeys[group].add(key);
              dataPoint[`${prefix}_${key.replace(/[\s.]+/g, '_')}`] = parseFloat(item[valueKey].toFixed(2));
          });
      };

      switch (chartType) {
          case 'performanceByOwner':
              dataPoint.totalContacts = result.totalContacts;
              result.owners?.forEach(owner => {
                  dynamicKeys.owners.add(owner.owner);
                  dataPoint[`owner_${owner.owner.replace(/[\s.]+/g, '_')}`] = owner.contacts;
              });
              break;
          case 'avgTouchpointsByOwner':
              result.owners?.forEach(owner => {
                  dynamicKeys.owners.add(owner.owner);
                  dataPoint[`${owner.owner.replace(/[\s.]+/g, '_')}_emails`] = parseFloat(owner.avgEmails.toFixed(2));
                  dataPoint[`${owner.owner.replace(/[\s.]+/g, '_')}_calls`] = parseFloat(owner.avgCalls.toFixed(2));
              });
              break;
          case 'responseRateByOwner':
              processGroup('owners', 'owner', 'responseRate', 'owner');
              break;
          case 'avgSampleTimingByOwner':
          case 'avgFirstCallTimingByOwner':
              processGroup('owners', 'owner', 'avgTiming', 'owner');
              break;
          case 'leadLevelsByOwner':
              processGroup('leadLevels', 'level', 'count', 'level');
              break;
          
          case 'contactCategories':
              processGroup('contactCategories', 'category', 'count', 'category');
              break;

          case 'territoryDistribution':
              processGroup('territories', 'territory', 'count', 'territory');
              break;
      }
      timeSeriesData.push(dataPoint);
    });

    // ... (rest of the function is unchanged)
    timeSeriesData.forEach(dp => {
        Object.keys(dynamicKeys).forEach(group => {
            dynamicKeys[group].forEach(key => {
                const prefix = group === 'owners' ? 'owner' : (group === 'contactCategories' ? 'category' : group.slice(0, -1));
                if (chartType === 'avgTouchpointsByOwner') {
                    const emailKey = `${key.replace(/[\s.]+/g, '_')}_emails`;
                    const callKey = `${key.replace(/[\s.]+/g, '_')}_calls`;
                    if (!(emailKey in dp)) dp[emailKey] = 0;
                    if (!(callKey in dp)) dp[callKey] = 0;
                } else {
                    const fullKey = `${prefix}_${key.replace(/[\s.]+/g, '_')}`;
                    if (!(fullKey in dp)) dp[fullKey] = 0;
                }
            });
        });
    });

    res.json({
      success: true,
      data: timeSeriesData,
      owners: Array.from(dynamicKeys.owners),
      territories: Array.from(dynamicKeys.territories),
      leadLevels: Array.from(dynamicKeys.leadLevels),
      contactCategories: Array.from(dynamicKeys.contactCategories)
    });

  } catch (error) {
    console.error('Error in getTimeSeriesData:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching time series data',
      error: error.message
    });
  }
};

module.exports = {
  getContactsTable,
  getAllContacts,
  getContactById,
  getContactStats,
  getContactConversations,
  updateContact,
  deleteContact,
  getFilterOptions,
  getTimeSeriesData 
};