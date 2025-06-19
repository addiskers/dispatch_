const express = require('express');
const router = express.Router();
const {
  getCRMAnalytics,
  getTeamPerformance,
  getCallAnalytics,
  getEmailAnalytics
} = require('../controllers/analyticsController');

// GET /api/analytics/crm - Get comprehensive CRM analytics
router.get('/crm', getCRMAnalytics);

// GET /api/analytics/team-performance - Get team performance metrics
router.get('/team-performance', getTeamPerformance);

// GET /api/analytics/calls - Get call analytics
router.get('/calls', getCallAnalytics);

// GET /api/analytics/emails - Get email analytics
router.get('/emails', getEmailAnalytics);

// GET /api/analytics/summary - Get quick summary for dashboard cards
router.get('/summary', async (req, res) => {
  try {
    // This could be a lightweight version that combines key metrics
    const Contact = require('../models/Contact');
    
    const summary = await Contact.aggregate([
      {
        $match: {
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
        }
      },
      {
        $group: {
          _id: null,
          totalContacts: { $sum: 1 },
          totalOpenDeals: { $sum: '$open_deals_count' },
          totalWonDeals: { $sum: '$won_deals_count' },
          avgLeadScore: { $avg: '$lead_score' },
          totalOutgoingEmails: { 
            $sum: '$crm_analytics.engagement.outgoing_emails' 
          },
          totalIncomingEmails: { 
            $sum: '$crm_analytics.engagement.incoming_emails' 
          },
          totalOutgoingCalls: { 
            $sum: '$crm_analytics.engagement.outgoing_calls' 
          },
          totalConnectedCalls: { 
            $sum: '$crm_analytics.engagement.connected_calls' 
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalContacts: 1,
          totalOpenDeals: 1,
          totalWonDeals: 1,
          avgLeadScore: { $round: ['$avgLeadScore', 1] },
          totalOutgoingEmails: { $ifNull: ['$totalOutgoingEmails', 0] },
          totalIncomingEmails: { $ifNull: ['$totalIncomingEmails', 0] },
          totalOutgoingCalls: { $ifNull: ['$totalOutgoingCalls', 0] },
          totalConnectedCalls: { $ifNull: ['$totalConnectedCalls', 0] },
          emailResponseRate: {
            $cond: [
              { $gt: ['$totalOutgoingEmails', 0] },
              { 
                $round: [
                  { 
                    $multiply: [
                      { $divide: ['$totalIncomingEmails', '$totalOutgoingEmails'] }, 
                      100
                    ] 
                  }, 
                  1
                ] 
              },
              0
            ]
          },
          callResponseRate: {
            $cond: [
              { $gt: ['$totalOutgoingCalls', 0] },
              { 
                $round: [
                  { 
                    $multiply: [
                      { $divide: ['$totalConnectedCalls', '$totalOutgoingCalls'] }, 
                      100
                    ] 
                  }, 
                  1
                ] 
              },
              0
            ]
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: summary[0] || {
        totalContacts: 0,
        totalOpenDeals: 0,
        totalWonDeals: 0,
        avgLeadScore: 0,
        totalOutgoingEmails: 0,
        totalIncomingEmails: 0,
        totalOutgoingCalls: 0,
        totalConnectedCalls: 0,
        emailResponseRate: 0,
        callResponseRate: 0
      }
    });
  } catch (error) {
    console.error('Error in analytics summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics summary',
      error: error.message
    });
  }
});

module.exports = router;