// routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Import the auth middleware
const {
  getContactsTable,
  getAllContacts,
  getContactById,
  getContactStats,
  getContactConversations,
  updateContact,
  deleteContact,
  getFilterOptions,
  getTimeSeriesData 
} = require('../controllers/contactController');

// Apply authentication middleware to all routes
router.use(auth);

// Now all routes are protected
router.get('/table', getContactsTable);
router.get('/filters', getFilterOptions);
router.get('/stats', getContactStats);
router.get('/timeseries', getTimeSeriesData); 
router.get('/:id/conversations', getContactConversations);
router.get('/:id', getContactById); 
router.get('/', getAllContacts);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);

module.exports = router;