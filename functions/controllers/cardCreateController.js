const cardsCreateService = require('../services/cardsCreateService');

// Save cards to database (receive processed cards from frontend)
const saveCards = async (req, res) => {
    try {
        const { cards } = req.body;

        if (!cards || !Array.isArray(cards) || cards.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'cards array is required'
            });
        }

        const results = await cardsCreateService.createOrUpdateCards(cards);

        res.status(200).json({
            success: true,
            message: `Processed ${cards.length} cards`,
            results: {
                total: cards.length,
                created: results.created,
                updated: results.updated,
                errors: results.errors.length
            },
            errorDetails: results.errors.length > 0 ? results.errors : undefined
        });

    } catch (err) {
        console.error('Error saving cards:', err);
        res.status(500).json({
            success: false,
            error: 'Error saving cards',
            details: err.message
        });
    }
};

// Get all cards from database
const getCardsCreate = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        console.log(`[CardCreateController] Getting cards with startDate: ${startDate}, endDate: ${endDate}`);

        const cards = await cardsCreateService.getCards(startDate, endDate);

        res.status(200).json({
            success: true,
            count: cards.length,
            data: cards
        });
    } catch (err) {
        console.error('[CardCreateController] Error getting cards:', err);
        res.status(500).json({
            success: false,
            error: 'Error getting cards',
            details: err.message
        });
    }
};

// Get cards by specific date
const getCardsByDate = async (req, res) => {
    try {
        const { date } = req.params;
        console.log(`[CardCreateController] Getting cards for date: ${date}`);

        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'date parameter is required (format: YYYY-MM-DD)'
            });
        }

        const cards = await cardsCreateService.getCardsByDate(date);

        res.status(200).json({
            success: true,
            date: date,
            count: cards.length,
            data: cards
        });
    } catch (err) {
        console.error('[CardCreateController] Error getting cards by date:', err);
        res.status(500).json({
            success: false,
            error: 'Error getting cards by date',
            details: err.message
        });
    }
};

module.exports = {
    saveCards,
    getCardsCreate,
    getCardsByDate
};
