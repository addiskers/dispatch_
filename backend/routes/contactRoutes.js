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
} = require('../controllers/contactController');

router.get('/table', getContactsTable);
router.get('/filters', getFilterOptions);
router.get('/stats', getContactStats);
router.get('/:id/conversations', getContactConversations);
router.get('/:id', getContactById);
router.get('/', getAllContacts);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);
module.exports = router;