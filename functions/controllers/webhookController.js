const webhookService = require('../services/webhookService');
const trelloService = require('../services/trelloService');
const cardService = require('../services/cardService');

const receiveWebhookController = async (req, res) => {
    if (req.body.action.type === 'createCard') {
        const data = await trelloService.getCardById(req.body.action.data.card.id);
        await cardService.pushCardToFirebase(data);
    }
    res.status(200).json({ message: "Webhook received" });
}

module.exports = {
    receiveWebhookController
}