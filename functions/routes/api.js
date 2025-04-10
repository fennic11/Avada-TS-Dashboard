const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const authController = require('../controllers/authController');
const notionController = require('../controllers/notionController');

// Auth routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Card routes
router.post('/cards', cardController.createOrUpdateCard);
router.get('/cards', cardController.getCards);
router.get('/cards/:cardUrl', cardController.getCardByUrl);

// Notion routes
router.get('/notion/search', notionController.search);
module.exports = router;
