const express = require('express');
const router = express.Router();
const webhookService = require('../services/webhookService');

router.post('/', webhookService.createWebhook);

module.exports = router;