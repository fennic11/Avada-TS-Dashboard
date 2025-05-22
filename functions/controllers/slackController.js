const slackService = require('../services/slackService');

const sendMessageToChannelController = async (req, res) => {
    const { message } = req.body;
    const result = await slackService.sendMessageToChannel(message);
    res.json(result);
}

const getChannelIdController = async (req, res) => {
    const result = await slackService.getChannelId();
    res.json(result);
}

const sendMessageController = async (req, res) => {
    const { message } = req.body;
    const result = await slackService.sendMessage(message);
    res.json(result);
}

module.exports = {
    sendMessageToChannelController,
    getChannelIdController,
    sendMessageController
} 
