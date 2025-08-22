const ErrorCard = require('../models/ErrorCard');

// Function to drop old unique indexes and create new ones
const setupIndexes = async () => {
    try {
        const collection = ErrorCard.collection;
        
        // Drop existing indexes on cardId and cardUrl
        try {
            await collection.dropIndex('cardId_1');
            console.log('✅ Dropped cardId_1 index');
        } catch (e) {
            console.log('ℹ️ cardId_1 index not found or already dropped');
        }
        
        try {
            await collection.dropIndex('cardUrl_1');
            console.log('✅ Dropped cardUrl_1 index');
        } catch (e) {
            console.log('ℹ️ cardUrl_1 index not found or already dropped');
        }
        
        // Create new unique index on uniqueId only
        await collection.createIndex({ uniqueId: 1 }, { unique: true });
        console.log('✅ Created unique index on uniqueId');
        
    } catch (error) {
        console.error('❌ Error setting up indexes:', error);
    }
};

const createErrorCard = async (cardData) => {
    try {
        const {cardId, cardUrl, cardName, labels, members, createdAt, note, penaltyPoints } = cardData;

        const errorCard = new ErrorCard({
            uniqueId: `${cardId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Create unique identifier
            cardId, 
            cardUrl, 
            cardName, 
            labels, 
            members, 
            createdAt: new Date(createdAt), // Use current timestamp for each submission
            note, 
            penaltyPoints
        });

        const savedErrorCard = await errorCard.save();
        return savedErrorCard;
    } catch (error) {
        // If it's a duplicate key error, try to setup indexes and retry
        if (error.code === 11000 && error.message.includes('cardId_1')) {
            console.log('🔄 Duplicate key error detected, setting up indexes...');
            await setupIndexes();
            
            // Retry the creation
            const {cardId, cardUrl, cardName, labels, members, createdAt, note, penaltyPoints } = cardData;
            const errorCard = new ErrorCard({
                uniqueId: `${cardId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                cardId, 
                cardUrl, 
                cardName, 
                labels, 
                members, 
                createdAt: new Date(createdAt),
                note, 
                penaltyPoints
            });
            
            const savedErrorCard = await errorCard.save();
            return savedErrorCard;
        }
        
        console.error('❌ Error in createErrorCard service:', error);
        throw error;
    }
};

const getErrorCardsByMonth = async (year, month) => {
    try {
        // Create start and end dates for the specified month
        const startDate = new Date(year, month - 1, 1); // month is 0-indexed in JS Date
        const endDate = new Date(year, month, 0); // Last day of the month
        
        // Set time to start and end of day
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        const errorCards = await ErrorCard.find({
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ createdAt: -1 }); // Sort by createdAt descending (newest first)
        
        return errorCards;
    } catch (error) {
        console.error('❌ Error in getErrorCardsByMonth service:', error);
        throw error;
    }
};

module.exports = { createErrorCard, setupIndexes, getErrorCardsByMonth };