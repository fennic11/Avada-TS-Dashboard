const { getBoardActionsByMemberAndDate } = require('../services/trelloService');

const getTrelloNotification = async (date, shift) => {
    console.log('getTrelloNotification', date, shift);
}

module.exports = {
    getTrelloNotification
}