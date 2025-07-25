const DevCard = require('../models/DevCard');

const createOrUpdateCard = async (cardData) => {
    try {
        const {cardId, cardUrl, cardName, description, labels, members, resolutionTime, resolutionTimeDev, firstActionTime, createdAt } = cardData;

        console.log('🔄 Processing card:');
        console.log('   - Card URL:', cardUrl);
        console.log('   - Card Name:', cardName);
        console.log('   - Resolution Time:', resolutionTime);

        // Use findOneAndUpdate with upsert option
        const card = await DevCard.findOneAndUpdate(
            { cardId }, // find criteria
            {
                cardId,
                cardName: cardName,
                cardUrl,
                description,
                labels,
                members,
                resolutionTime,
                resolutionTimeDev,
                firstActionTime,
                createdAt
            },
            {
                new: true,
                upsert: true, // Create if doesn't exist
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        console.log('✅ Card processed successfully');
        return card;
    } catch (error) {
        if (error.code === 11000) {
            console.error('❌ Duplicate key error - Card with this URL already exists');
        } else {
            console.error('❌ Error in createOrUpdateCard service:', error);
        }
        throw error;
    }
};

const getAllCards = async (startDate, endDate) => {
    try {
        console.log('📊 Fetching cards from:', startDate, 'to:', endDate);
        const cards = await DevCard.find({
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ createdAt: -1 });
        console.log(`📦 Found ${cards.length} cards`);
        return cards;
    } catch (error) {
        console.error('❌ Error in getAllCards service:', error);
        throw error;
    }
}


module.exports = {
    createOrUpdateCard,
    getAllCards
};
