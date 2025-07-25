const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const authController = require('../controllers/authController');
const notionController = require('../controllers/notionController');
const slackController = require('../controllers/slackController');
const workShiftController = require('../controllers/workShiftController');
const leaderboardController = require('../controllers/leaderboardController');
const crispController = require('../controllers/crispController');
const devCardController = require('../controllers/devCardController');
// Auth routes
router.put('/auth/user', authController.createOrUpdateUser);
router.get('/auth/user/:email', authController.getUserByEmail);
// Card routes
router.post('/cards', cardController.createOrUpdateCard);
router.get('/cards', cardController.getCards);
router.get('/cards/:cardUrl', cardController.getCardByUrl);
// Dev Card routes
router.post('/dev-cards', devCardController.createOrUpdateDevCard);
router.get('/dev-cards', devCardController.getDevCards);

// Notion routes
router.get('/notion/search', notionController.search);

// Slack routes
router.post('/slack/sendMessageToChannel', slackController.sendMessageToChannelController);
router.get('/slack/getChannelId', slackController.getChannelIdController);
router.post('/slack/sendMessage', slackController.sendMessageController);
router.get('/slack/sendNotificationsToTSMembers', slackController.sendNotificationsToTSMembersController);  

// Work shift routes
router.post('/work-shift', workShiftController.saveWorkShift);
router.get('/work-shift', workShiftController.getWorkShift);

// Leaderboard routes
router.get('/leaderboard', leaderboardController.getLeaderboard);
router.post('/leaderboard', leaderboardController.createLeaderboard);

// Crisp routes
router.post('/crisp/createConversation', crispController.createConversationController);


module.exports = router;


