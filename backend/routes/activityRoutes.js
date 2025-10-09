// routes/activityRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getSalespersonActivities, 
  getUserDayActivities,
  getUserActivitiesWithConversations
} = require('../controllers/activityController');

// Main activity tracking endpoint
// GET /api/activities/salesperson
// Query params: 
//   - startDate, endDate (ISO date strings)
//   - activityType: 'all', 'email', 'call'
//   - owner, country, territory, leadLevel, contactCategory (JSON arrays)
//   - page, limit, sortBy, sortOrder
//   - search (text search)
router.get('/salesperson', getSalespersonActivities);

// Get user-specific activities with full conversation data - NEW
// GET /api/activities/user/:userId/conversations
// Query params:
//   - startDate, endDate (ISO date strings)
//   - activityType: 'all', 'email', 'call'
// Returns: All conversations (emails & calls) for the specified user with contact info
router.get('/user/:userId/conversations', getUserActivitiesWithConversations);

// Get detailed activities for specific user on specific date
// GET /api/activities/salesperson/:userId/day/:date
router.get('/salesperson/:userId/day/:date', getUserDayActivities);

module.exports = router;