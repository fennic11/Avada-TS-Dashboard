const conversService = require("../services/conversService");

const getConversation = async (req, res) => {
    const { fromDate, toDate } = req.query;
    console.log('fromDate', fromDate);
    console.log('toDate', toDate);
    const conversation = await conversService.getConversationByDate(fromDate, toDate);
    res.json(conversation);
}

module.exports = {
    getConversation
}