const ErrorCard = require('../models/ErrorCard');

const createOrUpdateErrorCard = async (cardData) => {
    try {
        const {cardId, cardUrl, cardName, labels, members, createdAt, note, penaltyPoints } = cardData;

        const errorCard = await ErrorCard.findOneAndUpdate(
            { cardId },
            { cardId, cardUrl, cardName, labels, members, createdAt, note, penaltyPoints },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        return errorCard;
    } catch (error) {
        console.error('❌ Error in createOrUpdateErrorCard service:', error);
        throw error;
    }
};

module.exports = { createOrUpdateErrorCard };