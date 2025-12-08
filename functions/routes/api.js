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
const firebaseController = require('../controllers/firebaseController');
const errorCardController = require('../controllers/errorCardController');
const assignCardsController = require('../controllers/cardAssignController');
const errorAssignCardController = require('../controllers/errorAssignCardController');
const reviewsController = require('../controllers/reviewsController');
const conversController = require('../controllers/conversController');
const cardCreateController = require('../controllers/cardCreateController');
// Auth routes
router.put('/auth/user', authController.createOrUpdateUser);
router.get('/auth/user/:email', authController.getUserByEmail);
// Reviews routes
router.get('/reviews', reviewsController.getReviews);
// Convers routes
router.get('/convers', conversController.getConversation);  
// Card routes
router.post('/cards', cardController.createOrUpdateCard);
router.get('/cards', cardController.getCards);
router.get('/cards/:cardUrl', cardController.getCardByUrl);
router.get('/cards/list/:listId', cardController.getCardsOnTrello);

// Error Card routes
router.post('/error-cards', errorCardController.createErrorCard);
router.get('/error-cards', errorCardController.getErrorCardsByMonth);
router.put('/error-cards/:recordId/card-status', errorCardController.updateErrorCards);

// Error Assign Cards routes
router.post('/error-assign-cards', errorAssignCardController.createErrorAssignCards);
router.get('/error-assign-cards', errorAssignCardController.getErrorAssignCards);
// router.put('/error-assign-cards/:recordId/card-status', errorAssignCardController.updateErrorAssignCards);
// router.put('/error-assign-cards/:recordId/card-status', errorAssignCardController.updateCardStatus);
// router.delete('/error-assign-cards/:recordId', errorAssignCardController.deleteErrorAssignCards);

// Dev Card routes
router.post('/dev-cards', devCardController.createOrUpdateDevCard);
router.get('/dev-cards', devCardController.getDevCards);

// Assign Cards routes
router.post('/assign-cards', assignCardsController.createAssignCards);
router.get('/assign-cards', assignCardsController.getAssignCards);
router.put('/assign-cards/:recordId/card-status', assignCardsController.updateAssignCards);
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

// Firebase routes
router.post('/firebase/push', firebaseController.pushData);
router.post('/firebase/push-with-id', firebaseController.pushDataWithId);
router.put('/firebase/update', firebaseController.updateData);
router.get('/firebase/:collectionName', firebaseController.getData);
router.get('/firebase/:collectionName/:docId', firebaseController.getData);
router.delete('/firebase/:collectionName/:docId', firebaseController.deleteData);
router.post('/firebase/batch-push', firebaseController.batchPush);
router.post('/firebase/query', firebaseController.queryData);

// Card Create routes
router.post('/cards-create', cardCreateController.saveCards);
router.get('/cards-create', cardCreateController.getCardsCreate);
router.get('/cards-create/date/:date', cardCreateController.getCardsByDate);

module.exports = router;


