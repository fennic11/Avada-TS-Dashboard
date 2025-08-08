const express = require('express');
const router = express.Router();
const webhookService = require('../services/webhookService');

// router.post('/', webhookService.createWebhook);
router.post('/', webhookService.receiveWebhook);


module.exports = router;