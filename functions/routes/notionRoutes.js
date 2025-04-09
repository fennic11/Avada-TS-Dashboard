const express = require('express');
const router = express.Router();
const notionController = require('../controllers/notionController');

// Search route
router.get('/search', notionController.search);

// Get page content
router.get('/pages/:pageId', notionController.getPageContent);

// List databases
router.get('/databases', notionController.listDatabases);

// Get database content
router.get('/databases/:databaseId', notionController.getDatabaseContent);

module.exports = router; 