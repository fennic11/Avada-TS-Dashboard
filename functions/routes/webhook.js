const express = require('express');
const router = express.Router();
const { receiveWebhookController } = require('../controllers/webhookController');

// router.post('/', webhookService.createWebhook);
router.post('/', receiveWebhookController);


module.exports = router;