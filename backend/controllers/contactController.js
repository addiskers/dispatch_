const Contact = require('../models/Contact');

// Updated getContactsTable function with fixed search including market name and CRM analytics
const getContactsTable = async (req, res) => {
  try {
    // Extract query parameters
    const {
      page = 1,
      limit = 100,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search = '',
      status = '',
      owner = '',
      startDate = '',
      endDate = '',
      territory = '',
      leadLevel = '',
      contactCategory = '',
      customTags = '',
      isActive = ''
    } = req.query;

    // Build query object
    const query = {};

    // FIXED: Add search filter - INCLUDING market name field
    if (search) {
      query.$or = [
        { display_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile_number: { $regex: search, $options: 'i' } },
        { 'custom_field.cf_company_name': { $regex: search, $options: 'i' } },
        { 'custom_field.cf_report_name': { $regex: search, $options: 'i' } } // Added market name search
      ];
    }

    // Add filters
    if (status) query.status_name = status;
    
    // Handle owner filter - check for "Unassigned" selection
    if (owner) {
      if (owner.startsWith('Unassigned')) {
        query.$and = query.$and || [];
        query.$and.push({
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
        });
      } else {
        query.owner_name = { $regex: owner, $options: 'i' };
      }
    }
    
    // Handle territory filter - check for "Unassigned" selection
    if (territory) {
      if (territory.startsWith('Unassigned')) {
        query.$and = query.$and || [];
        query.$and.push({
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
        });
      } else {
        query.territory_name = territory;
      }
    }
    
    // Handle lead level filter - check for "Unassigned" selection
    if (leadLevel) {
      if (leadLevel.startsWith('Unassigned')) {
        query.$and = query.$and || [];
        query.$and.push({
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
        });
      } else {
        query['custom_field.cf_lead_level'] = leadLevel;
      }
    }

    // Handle contact category filter - check for "Unassigned" selection
    if (contactCategory) {
      if (contactCategory.startsWith('Unassigned')) {
        query.$and = query.$and || [];
        query.$and.push({
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
        });
      } else {
        query['custom_field.cf_contact_category'] = contactCategory;
      }
    }

    // Handle custom tags filter - check for "Unassigned" selection
    if (customTags) {
      if (customTags.startsWith('Unassigned')) {
        query.$and = query.$and || [];
        query.$and.push({
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
        });
      } else {
        query['custom_field.cf_custom_tags'] = customTags;
      }
    }

    // Handle active status filter (based on CRM analytics)
    if (isActive) {
      query.$and = query.$and || [];
      
      if (isActive === 'yes') {
        // Contact is active if they have incoming emails OR connected calls
        query.$and.push({
          $or: [
            { 'crm_analytics.engagement.incoming_emails': { $gt: 0 } },
            { 'crm_analytics.engagement.connected_calls': { $gt: 0 } }
          ]
        });
      } else if (isActive === 'no') {
        // Contact is not active if they have NO incoming emails AND NO connected calls
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

    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination with the same filter
    const totalCount = await Contact.countDocuments(query);
    console.log('Total count found:', totalCount);

    // Map frontend sort fields to database fields
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
      // For sorting by active status, we'll use a computed field approach
      dbSortField = 'crm_analytics.engagement.incoming_emails';
    } else if (sortBy === 'sample_sent_timing') {
      // For sorting by sample sent timing
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
      dbSortField = 'crm_analytics.engagement.call_duration_total';
    }

    // Get contacts with required fields for table INCLUDING CRM analytics
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
        territory_name: c.territory_name
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

    // Transform data for table view and double-check market_name
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
        status_name: formatValue(contact.status_name),
        owner_name: formatValue(contact.owner_name),
        created_at: contact.created_at,
        last_contacted_mode: formatValue(contact.last_contacted_mode),
        last_contacted_time: contact.last_contacted || null,
        
        // CRM Analytics fields
        last_email_received: contact.crm_analytics?.last_email_received?.date || null,
        first_email_with_attachment: contact.crm_analytics?.first_email_with_attachment?.date || null,
        total_touchpoints: contact.crm_analytics?.engagement?.total_touchpoints || 0,
        outgoing_emails: contact.crm_analytics?.engagement?.outgoing_emails || 0,
        incoming_emails: contact.crm_analytics?.engagement?.incoming_emails || 0,
        outgoing_calls: contact.crm_analytics?.engagement?.outgoing_calls || 0,
        connected_calls: contact.crm_analytics?.engagement?.connected_calls || 0,
        not_connected_calls: contact.crm_analytics?.engagement?.not_connected_calls || 0,
        call_duration_total: contact.crm_analytics?.engagement?.call_duration_total || 0,
        call_duration_formatted: formatDuration(contact.crm_analytics?.engagement?.call_duration_total || 0)
      }));

    // Calculate analytics for all filtered contacts (not just current page)
    const allFilteredContacts = await Contact.find(query)
      .select('custom_field crm_analytics created_at')
      .lean();

    // Calculate analytics for all filtered contacts
    const calculateFilteredAnalytics = (contacts) => {
      if (!contacts || contacts.length === 0) {
        return {
          totalContacts: 0,
          avgTouchpoints: '0.0',
          avgEmails: '0.0',
          avgCalls: '0.0',              // NEW: Add average calls
          avgConnectedCalls: '0.0',
          avgSampleSentHours: '0.0',
          clientEmailsReceived: 0,
          avgCallDuration: '0',
          responseRate: '0.0',
          samplesSentCount: 0
        };
      }

      let totalTouchpoints = 0;
      let totalOutgoingEmails = 0;
      let totalOutgoingCalls = 0;        // NEW: Track total outgoing calls
      let totalIncomingEmails = 0;
      let totalConnectedCalls = 0;
      let totalSampleSentHours = 0;
      let validSampleSentCount = 0;
      let totalCallDuration = 0;
      let validCallDurationCount = 0;
      let contactsWithCalls = 0;

      contacts.forEach(contact => {
        if (contact.crm_analytics?.engagement) {
          const engagement = contact.crm_analytics.engagement;
          
          // Total touchpoints
          totalTouchpoints += engagement.total_touchpoints || 0;
          
          // Total emails (outgoing)
          totalOutgoingEmails += engagement.outgoing_emails || 0;
          
          // NEW: Total outgoing calls
          totalOutgoingCalls += engagement.outgoing_calls || 0;
          
          // Connected calls
          const connectedCalls = engagement.connected_calls || 0;
          totalConnectedCalls += connectedCalls;
          
          // Count contacts with calls for average calculation
          if ((engagement.outgoing_calls || 0) > 0) {
            contactsWithCalls++;
          }
          
          // Incoming emails (client emails received)
          totalIncomingEmails += engagement.incoming_emails || 0;
          
          // Call duration (only for contacts with calls)
          if (engagement.call_duration_total && engagement.call_duration_total > 0) {
            totalCallDuration += engagement.call_duration_total;
            validCallDurationCount++;
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
      });

      // Calculate response rate (incoming emails / outgoing emails)
      const responseRate = totalOutgoingEmails > 0 ? (totalIncomingEmails / totalOutgoingEmails) * 100 : 0;

      return {
        totalContacts: contacts.length,
        avgTouchpoints: contacts.length > 0 ? (totalTouchpoints / contacts.length).toFixed(1) : '0.0',
        avgEmails: contacts.length > 0 ? (totalOutgoingEmails / contacts.length).toFixed(1) : '0.0',
        avgCalls: contacts.length > 0 ? (totalOutgoingCalls / contacts.length).toFixed(1) : '0.0',  // NEW: Average calls per contact
        avgConnectedCalls: contactsWithCalls > 0 ? (totalConnectedCalls / contactsWithCalls).toFixed(1) : '0.0',
        avgSampleSentHours: validSampleSentCount > 0 ? (totalSampleSentHours / validSampleSentCount).toFixed(1) : '0.0',
        clientEmailsReceived: totalIncomingEmails,
        avgCallDuration: validCallDurationCount > 0 ? (totalCallDuration / validCallDurationCount).toFixed(0) : '0',
        responseRate: responseRate.toFixed(1),
        samplesSentCount: validSampleSentCount
      };
    };

    const analytics = calculateFilteredAnalytics(allFilteredContacts);

    // Calculate pagination metadata based on filtered results
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: tableData,
      analytics: analytics, // Add analytics to response
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

// ALSO UPDATE getAllContacts function with the same fix
const getAllContacts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search = '',
      status = '',
      owner = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const query = {};

    // FIXED: Add market name to search
    if (search) {
      query.$or = [
        { display_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile_number: { $regex: search, $options: 'i' } },
        { 'custom_field.cf_company_name': { $regex: search, $options: 'i' } },
        { 'custom_field.cf_report_name': { $regex: search, $options: 'i' } } // Added market name search
      ];
    }

    if (status) query.status_name = status;
    if (owner) query.owner_name = { $regex: owner, $options: 'i' };

    // Filter out contacts with empty, "-", "NA", or invalid market names
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

// Get single contact by ID
const getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by MongoDB _id or Freshworks id
    const contact = await Contact.findOne({
      $or: [
        { _id: id },
        { id: parseInt(id) }
      ]
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
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

// Get contact statistics
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

    // Get contacts by status (with market name filter)
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

    // Get contacts by owner (with market name filter)
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

    // Get contacts by territory (changed from region)
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

    // Get average call duration and total calls (with market name filter)
    const callStats = await Contact.aggregate([
      { $match: marketNameFilter },
      { $unwind: '$conversations' },
      { $match: { 'conversations.type': 'phone' } },
      {
        $group: {
          _id: null,
          avgCallDuration: { $avg: '$conversations.call_duration' },
          totalCalls: { $sum: 1 },
          answeredCalls: {
            $sum: {
              $cond: [
                { $gt: ['$conversations.call_duration', 0] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get recent activity stats (with market name filter)
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

// Get contact conversations
const getContactConversations = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, page = 1, limit = 10 } = req.query;

    const contact = await Contact.findOne({
      $or: [
        { _id: id },
        { id: parseInt(id) }
      ]
    }).select('conversations');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    let conversations = contact.conversations;

    // Filter by type if specified
    if (type) {
      conversations = conversations.filter(conv => conv.type === type);
    }

    // Sort by created_at descending
    conversations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedConversations = conversations.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedConversations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(conversations.length / parseInt(limit)),
        totalCount: conversations.length,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
      error: error.message
    });
  }
};

// Update contact
const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const contact = await Contact.findOneAndUpdate(
      {
        $or: [
          { _id: id },
          { id: parseInt(id) }
        ]
      },
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

// Delete contact
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    
    const contact = await Contact.findOneAndDelete({
      $or: [
        { _id: id },
        { id: parseInt(id) }
      ]
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting contact',
      error: error.message
    });
  }
};

// Get filter options (for dropdowns) - updated with territories and NA filtering
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

    const [statuses, owners, territories, leadLevels, contactCategories, customTags] = await Promise.all([
      Contact.distinct('status_name', marketNameFilter),
      Contact.distinct('owner_name', marketNameFilter),
      Contact.distinct('territory_name', marketNameFilter),
      Contact.distinct('custom_field.cf_lead_level', marketNameFilter),
      Contact.distinct('custom_field.cf_contact_category', marketNameFilter),
      Contact.distinct('custom_field.cf_custom_tags', marketNameFilter)
    ]);

    // Filter out NA, null, empty values from all filter options
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

    // Count contacts with missing/NA values for each field
    const [unassignedOwnerCount, unassignedTerritoryCount, unassignedLeadLevelCount, unassignedContactCategoryCount, unassignedCustomTagsCount] = await Promise.all([
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
      })
    ]);

    // Prepare filter options with unassigned counts
    const processedOwners = filterNA(owners);
    const processedTerritories = filterNA(territories);
    const processedLeadLevels = filterNA(leadLevels);
    const processedContactCategories = filterNA(contactCategories);
    const processedCustomTags = filterNA(customTags);

    // Add "Unassigned" options if there are contacts without these values
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

    res.json({
      success: true,
      data: {
        statuses: filterNA(statuses),
        owners: processedOwners,
        territories: processedTerritories,
        leadLevels: processedLeadLevels,
        contactCategories: processedContactCategories,
        customTags: processedCustomTags,
        activeStatus: ['Yes', 'No'] // Static options for active filter
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

module.exports = {
  getContactsTable,
  getAllContacts,
  getContactById,
  getContactStats,
  getContactConversations,
  updateContact,
  deleteContact,
  getFilterOptions
};