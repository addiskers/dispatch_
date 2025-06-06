// routes/contacts.js
const express = require('express');
const router = express.Router();
const {
  getContactsTable,
  getAllContacts,
  getContactById,
  getContactStats,
  getContactConversations,
  updateContact,
  deleteContact,
  getFilterOptions
} = require('../controllers/contactController'); // Adjust path as needed

// GET /api/contacts/table - Get contacts for table view
router.get('/table', getContactsTable);

// GET /api/contacts/filters - Get filter options
router.get('/filters', getFilterOptions);

// GET /api/contacts/stats - Get contact statistics
router.get('/stats', getContactStats);

// GET /api/contacts - Get all contacts with full details
router.get('/', getAllContacts);

// GET /api/contacts/:id - Get single contact by ID
router.get('/:id', getContactById);

// GET /api/contacts/:id/conversations - Get contact conversations
router.get('/:id/conversations', getContactConversations);

// PUT /api/contacts/:id - Update contact
router.put('/:id', updateContact);

// DELETE /api/contacts/:id - Delete contact
router.delete('/:id', deleteContact);

module.exports = router;