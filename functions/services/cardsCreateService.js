const CardCreate = require('../models/CardCreate');

// Create or update multiple cards to database (upsert)
const createOrUpdateCards = async (cards) => {
    console.log(`[CardsCreateService] Starting createOrUpdateCards with ${cards.length} cards`);

    const results = {
        created: 0,
        updated: 0,
        errors: []
    };

    for (const card of cards) {
        try {
            const cardId = card.cardId || card.id;
            const cardData = {
                cardId: cardId,
                cardName: card.cardName || card.name,
                cardUrl: card.cardUrl || card.url || card.shortUrl,
                dueComplete: card.dueComplete || false,
                labels: card.labels || [],
                members: card.members || card.idMembers || [],
                createdAt: card.createdAt
            };

            console.log(`[CardsCreateService] Processing card: ${cardId} - ${cardData.cardName}`);

            // Find card by cardId, if exists update, if not create new
            const result = await CardCreate.findOneAndUpdate(
                { cardId: cardId },
                { $set: cardData },
                { upsert: true, new: true, rawResult: true }
            );

            if (result.lastErrorObject?.updatedExisting) {
                console.log(`[CardsCreateService] Updated existing card: ${cardId}`);
                results.updated++;
            } else {
                console.log(`[CardsCreateService] Created new card: ${cardId}`);
                results.created++;
            }
        } catch (error) {
            console.error(`[CardsCreateService] Error processing card ${card.cardId || card.id}:`, error.message);
            results.errors.push({
                cardId: card.cardId || card.id,
                cardName: card.cardName || card.name,
                error: error.message
            });
        }
    }

    console.log(`[CardsCreateService] Completed: Created ${results.created}, Updated ${results.updated}, Errors ${results.errors.length}`);
    return results;
};

// Get cards with optional date filter
const getCards = async (startDate, endDate) => {
    console.log(`[CardsCreateService] Getting cards with date range: ${startDate || 'none'} - ${endDate || 'none'}`);

    try {
        // Data in DB is stored as Vietnam time in UTC format
        // e.g., card created at 00:05 Vietnam (9/12) is stored as 2025-12-09T00:05:00Z
        // So we query directly without timezone conversion

        const fromDateStart = new Date(`${startDate}T00:00:00.000Z`);
        const toDateEnd = new Date(`${endDate}T23:59:59.999Z`);

        console.log('[CardsCreateService] Query date range:', {
            startDate,
            endDate,
            fromDateStart: fromDateStart.toISOString(),
            toDateEnd: toDateEnd.toISOString(),
        });

        const cards = await CardCreate.find({
            createdAt: {
                $gte: fromDateStart,
                $lte: toDateEnd,
            },
        }).sort({ createdAt: -1 });

        console.log(`[CardsCreateService] Found ${cards.length} cards`);
        return cards;
    } catch (error) {
        console.error('[CardsCreateService] Error in getCards:', error);
        throw error;
    }
};

// Get cards by specific date (single day)
const getCardsByDate = async (date) => {
    console.log(`[CardsCreateService] Getting cards for date: ${date}`);

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
        createdAt: {
            $gte: startOfDay,
            $lte: endOfDay
        }
    };

    const cards = await CardCreate.find(query).sort({ createdAt: -1 });
    console.log(`[CardsCreateService] Found ${cards.length} cards for date ${date}`);
    return cards;
};

// Get card by cardId
const getCardById = async (cardId) => {
    return await CardCreate.findOne({ cardId });
};

// Delete card by cardId
const deleteCard = async (cardId) => {
    return await CardCreate.deleteOne({ cardId });
};

// Update single card
const updateCard = async (cardId, updateData) => {
    return await CardCreate.updateOne(
        { cardId },
        { $set: updateData }
    );
};

// Get cards count
const getCardsCount = async (query = {}) => {
    return await CardCreate.countDocuments(query);
};

module.exports = {
    createOrUpdateCards,
    getCards,
    getCardsByDate,
    getCardById,
    deleteCard,
    updateCard,
    getCardsCount
};
