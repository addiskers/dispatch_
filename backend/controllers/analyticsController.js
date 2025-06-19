const Contact = require('../models/Contact');

// Get overall CRM analytics dashboard data
const getCRMAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, territory, status } = req.query;
    
    // Build base query with market name filter
    const baseQuery = {
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

    // Add filters
    if (territory) baseQuery.territory_name = territory;
    if (status) baseQuery.status_name = status;
    if (startDate || endDate) {
      baseQuery.created_at = {};
      if (startDate) baseQuery.created_at.$gte = new Date(startDate);
      if (endDate) baseQuery.created_at.$lte = new Date(endDate);
    }

    // Get all contacts with analytics data
    const contacts = await Contact.find(baseQuery).select('crm_analytics display_name territory_name status_name created_at');

    // Initialize analytics data
    const analytics = {
      totalContacts: contacts.length,
      userPerformance: {},
      totalMetrics: {
        outgoingEmails: 0,
        incomingEmails: 0,
        outgoingCalls: 0,
        connectedCalls: 0,
        notConnectedCalls: 0,
        totalCallDuration: 0,
        avgCallDuration: 0,
        responseRate: 0
      },
      territoryStats: {},
      statusDistribution: {},
      monthlyTrends: {},
      leadConversionFunnel: {
        totalLeads: 0,
        qualified: 0,
        contacted: 0,
        responded: 0,
        converted: 0
      }
    };

    // Process each contact's analytics
    contacts.forEach(contact => {
      if (contact.crm_analytics) {
        const crmData = contact.crm_analytics;
        
        // Process user activities
        if (crmData.user_activities) {
          Object.values(crmData.user_activities).forEach(userActivity => {
            const userId = userActivity.user_id;
            const userName = userActivity.user_name || 'Unknown';
            const userEmail = userActivity.user_email || '';
            
            // Skip contact entries (non-team members)
            if (!userEmail.includes('@skyquestt.com') && !userEmail.includes('@skyquest.com')) {
              return;
            }

            if (!analytics.userPerformance[userId]) {
              analytics.userPerformance[userId] = {
                userId,
                userName,
                userEmail,
                leadsHandled: 0,
                emailsSent: 0,
                callsMade: 0,
                connectedCalls: 0,
                notConnectedCalls: 0,
                totalCallDuration: 0,
                avgCallDuration: 0,
                responseRate: 0,
                conversionRate: 0,
                lastActivity: null
              };
            }

            const userStats = analytics.userPerformance[userId];
            userStats.leadsHandled += 1;
            userStats.emailsSent += userActivity.emails_sent || 0;
            userStats.callsMade += userActivity.calls_made || 0;
            userStats.connectedCalls += userActivity.connected_calls || 0;
            userStats.notConnectedCalls += userActivity.not_connected_calls || 0;
            userStats.totalCallDuration += userActivity.call_duration_total || 0;
            
            if (userActivity.last_activity && (!userStats.lastActivity || new Date(userActivity.last_activity) > new Date(userStats.lastActivity))) {
              userStats.lastActivity = userActivity.last_activity;
            }
          });
        }

        // Process engagement metrics
        if (crmData.engagement) {
          const engagement = crmData.engagement;
          analytics.totalMetrics.outgoingEmails += engagement.outgoing_emails || 0;
          analytics.totalMetrics.incomingEmails += engagement.incoming_emails || 0;
          analytics.totalMetrics.outgoingCalls += engagement.outgoing_calls || 0;
          analytics.totalMetrics.connectedCalls += engagement.connected_calls || 0;
          analytics.totalMetrics.notConnectedCalls += engagement.not_connected_calls || 0;
          analytics.totalMetrics.totalCallDuration += engagement.call_duration_total || 0;
        }

        // Territory stats
        const territory = contact.territory_name || 'Unassigned';
        if (!analytics.territoryStats[territory]) {
          analytics.territoryStats[territory] = {
            totalContacts: 0,
            totalEmails: 0,
            totalCalls: 0,
            avgResponseRate: 0
          };
        }
        analytics.territoryStats[territory].totalContacts += 1;
        if (crmData.engagement) {
          analytics.territoryStats[territory].totalEmails += (crmData.engagement.outgoing_emails || 0);
          analytics.territoryStats[territory].totalCalls += (crmData.engagement.outgoing_calls || 0);
        }

        // Status distribution
        const status = contact.status_name || 'Unknown';
        analytics.statusDistribution[status] = (analytics.statusDistribution[status] || 0) + 1;

        // Monthly trends (group by creation month)
        const createdMonth = new Date(contact.created_at).toISOString().substring(0, 7); // YYYY-MM
        if (!analytics.monthlyTrends[createdMonth]) {
          analytics.monthlyTrends[createdMonth] = {
            month: createdMonth,
            newLeads: 0,
            emailsSent: 0,
            callsMade: 0,
            conversions: 0
          };
        }
        analytics.monthlyTrends[createdMonth].newLeads += 1;
        if (crmData.engagement) {
          analytics.monthlyTrends[createdMonth].emailsSent += (crmData.engagement.outgoing_emails || 0);
          analytics.monthlyTrends[createdMonth].callsMade += (crmData.engagement.outgoing_calls || 0);
        }
      }
    });

    // Calculate averages and rates for user performance
    Object.values(analytics.userPerformance).forEach(user => {
      if (user.callsMade > 0) {
        user.avgCallDuration = user.totalCallDuration / user.callsMade;
        user.responseRate = (user.connectedCalls / user.callsMade) * 100;
      }
      // Simple conversion rate calculation (you can enhance this based on your business logic)
      user.conversionRate = user.leadsHandled > 0 ? (user.connectedCalls / user.leadsHandled) * 100 : 0;
    });

    // Calculate total metrics averages
    if (analytics.totalMetrics.outgoingCalls > 0) {
      analytics.totalMetrics.avgCallDuration = analytics.totalMetrics.totalCallDuration / analytics.totalMetrics.outgoingCalls;
      analytics.totalMetrics.responseRate = (analytics.totalMetrics.connectedCalls / analytics.totalMetrics.outgoingCalls) * 100;
    }

    // Convert monthly trends to array and sort
    analytics.monthlyTrends = Object.values(analytics.monthlyTrends).sort((a, b) => a.month.localeCompare(b.month));

    // Convert user performance to array
    analytics.userPerformance = Object.values(analytics.userPerformance);

    // Lead conversion funnel
    analytics.leadConversionFunnel.totalLeads = analytics.totalContacts;
    analytics.leadConversionFunnel.qualified = contacts.filter(c => c.status_name !== 'DEAD' && c.status_name !== 'SPAM').length;
    analytics.leadConversionFunnel.contacted = contacts.filter(c => c.crm_analytics?.engagement?.outgoing_emails > 0 || c.crm_analytics?.engagement?.outgoing_calls > 0).length;
    analytics.leadConversionFunnel.responded = contacts.filter(c => c.crm_analytics?.engagement?.incoming_emails > 0 || c.crm_analytics?.engagement?.connected_calls > 0).length;
    analytics.leadConversionFunnel.converted = contacts.filter(c => c.status_name === 'WON' || c.status_name === 'CLOSED WON').length;

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error in getCRMAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching CRM analytics',
      error: error.message
    });
  }
};

// Get team performance analytics
const getTeamPerformance = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const contacts = await Contact.find({
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
      },
      'crm_analytics.user_activities': { $exists: true }
    }).select('crm_analytics');

    const teamStats = {};

    contacts.forEach(contact => {
      if (contact.crm_analytics?.user_activities) {
        Object.values(contact.crm_analytics.user_activities).forEach(userActivity => {
          const userEmail = userActivity.user_email || '';
          
          // Only include team members
          if (!userEmail.includes('@skyquestt.com') && !userEmail.includes('@skyquest.com')) {
            return;
          }

          const userId = userActivity.user_id;
          if (!teamStats[userId]) {
            teamStats[userId] = {
              userId,
              userName: userActivity.user_name,
              userEmail: userActivity.user_email,
              totalLeads: 0,
              totalEmails: 0,
              totalCalls: 0,
              connectedCalls: 0,
              avgResponseTime: 0,
              conversionRate: 0,
              recentActivity: 0
            };
          }

          teamStats[userId].totalLeads += 1;
          teamStats[userId].totalEmails += userActivity.emails_sent || 0;
          teamStats[userId].totalCalls += userActivity.calls_made || 0;
          teamStats[userId].connectedCalls += userActivity.connected_calls || 0;

          // Check if activity is recent
          if (userActivity.last_activity && new Date(userActivity.last_activity) >= daysAgo) {
            teamStats[userId].recentActivity += 1;
          }
        });
      }
    });

    // Calculate rates
    Object.values(teamStats).forEach(member => {
      if (member.totalCalls > 0) {
        member.responseRate = (member.connectedCalls / member.totalCalls) * 100;
      }
      member.conversionRate = member.totalLeads > 0 ? (member.connectedCalls / member.totalLeads) * 100 : 0;
    });

    res.json({
      success: true,
      data: Object.values(teamStats)
    });
  } catch (error) {
    console.error('Error in getTeamPerformance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team performance',
      error: error.message
    });
  }
};

// Get call analytics
const getCallAnalytics = async (req, res) => {
  try {
    const contacts = await Contact.find({
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
      },
      conversations: { $exists: true, $ne: [] }
    }).select('conversations crm_analytics');

    const callAnalytics = {
      totalCalls: 0,
      answeredCalls: 0,
      noResponseCalls: 0,
      leftMessageCalls: 0,
      avgCallDuration: 0,
      totalCallDuration: 0,
      callOutcomes: {},
      dailyCallTrends: {},
      hourlyCallDistribution: new Array(24).fill(0)
    };

    contacts.forEach(contact => {
      if (contact.conversations) {
        contact.conversations.forEach(conversation => {
          if (conversation.type === 'phone') {
            callAnalytics.totalCalls += 1;
            
            const duration = conversation.call_duration || 0;
            callAnalytics.totalCallDuration += duration;

            // Categorize call outcomes
            const outcome = conversation.outcome?.name || 'Unknown';
            callAnalytics.callOutcomes[outcome] = (callAnalytics.callOutcomes[outcome] || 0) + 1;

            if (outcome === 'No response') {
              callAnalytics.noResponseCalls += 1;
            } else if (outcome === 'Left message') {
              callAnalytics.leftMessageCalls += 1;
            } else if (duration > 0) {
              callAnalytics.answeredCalls += 1;
            }

            // Daily trends
            const callDate = new Date(conversation.created_at).toISOString().split('T')[0];
            if (!callAnalytics.dailyCallTrends[callDate]) {
              callAnalytics.dailyCallTrends[callDate] = {
                date: callDate,
                totalCalls: 0,
                answeredCalls: 0,
                avgDuration: 0
              };
            }
            callAnalytics.dailyCallTrends[callDate].totalCalls += 1;
            if (duration > 0) callAnalytics.dailyCallTrends[callDate].answeredCalls += 1;

            // Hourly distribution
            const hour = new Date(conversation.created_at).getHours();
            callAnalytics.hourlyCallDistribution[hour] += 1;
          }
        });
      }
    });

    // Calculate averages
    if (callAnalytics.totalCalls > 0) {
      callAnalytics.avgCallDuration = callAnalytics.totalCallDuration / callAnalytics.totalCalls;
    }

    // Convert daily trends to array
    callAnalytics.dailyCallTrends = Object.values(callAnalytics.dailyCallTrends)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days

    res.json({
      success: true,
      data: callAnalytics
    });
  } catch (error) {
    console.error('Error in getCallAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching call analytics',
      error: error.message
    });
  }
};

// Get email analytics
const getEmailAnalytics = async (req, res) => {
  try {
    const contacts = await Contact.find({
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
      },
      'crm_analytics.engagement': { $exists: true }
    }).select('crm_analytics conversations territory_name');

    const emailAnalytics = {
      totalOutgoing: 0,
      totalIncoming: 0,
      emailThreads: 0,
      avgResponseTime: 0,
      responseRate: 0,
      territoryBreakdown: {},
      monthlyTrends: {},
      emailEngagement: {
        opened: 0,
        clicked: 0,
        bounced: 0,
        replied: 0
      }
    };

    contacts.forEach(contact => {
      if (contact.crm_analytics?.engagement) {
        const engagement = contact.crm_analytics.engagement;
        
        emailAnalytics.totalOutgoing += engagement.outgoing_emails || 0;
        emailAnalytics.totalIncoming += engagement.incoming_emails || 0;
        emailAnalytics.emailThreads += engagement.email_threads || 0;

        // Territory breakdown
        const territory = contact.territory_name || 'Unassigned';
        if (!emailAnalytics.territoryBreakdown[territory]) {
          emailAnalytics.territoryBreakdown[territory] = {
            outgoing: 0,
            incoming: 0,
            responseRate: 0
          };
        }
        emailAnalytics.territoryBreakdown[territory].outgoing += engagement.outgoing_emails || 0;
        emailAnalytics.territoryBreakdown[territory].incoming += engagement.incoming_emails || 0;
      }

      // Process email conversations for engagement
      if (contact.conversations) {
        contact.conversations.forEach(conversation => {
          if (conversation.type === 'email_thread' && conversation.messages) {
            conversation.messages.forEach(message => {
              if (message.engagement) {
                if (message.engagement.opened) emailAnalytics.emailEngagement.opened += 1;
                if (message.engagement.clicked) emailAnalytics.emailEngagement.clicked += 1;
                if (message.engagement.bounced) emailAnalytics.emailEngagement.bounced += 1;
              }
            });
          }
        });
      }
    });

    // Calculate response rate
    if (emailAnalytics.totalOutgoing > 0) {
      emailAnalytics.responseRate = (emailAnalytics.totalIncoming / emailAnalytics.totalOutgoing) * 100;
    }

    // Calculate territory response rates
    Object.values(emailAnalytics.territoryBreakdown).forEach(territory => {
      if (territory.outgoing > 0) {
        territory.responseRate = (territory.incoming / territory.outgoing) * 100;
      }
    });

    res.json({
      success: true,
      data: emailAnalytics
    });
  } catch (error) {
    console.error('Error in getEmailAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching email analytics',
      error: error.message
    });
  }
};

module.exports = {
  getCRMAnalytics,
  getTeamPerformance,
  getCallAnalytics,
  getEmailAnalytics
};