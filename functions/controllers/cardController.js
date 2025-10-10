const cardService = require('../services/cardService');
const trelloService = require('../services/trelloService');

const createCard = async (req, res) => {
    try {
        const card = await cardService.createCard(req.body);
        console.log(card);
        res.status(201).json(card);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi tạo card', details: err.message });
    }
};

const getCards = async (req, res) => {
    try {
        const startDate = new Date(`${req.query.start}T00:00:00.000Z`);
        const endDate = new Date(`${req.query.end}T23:59:59.999Z`);
        const cards = await cardService.getAllCards(startDate, endDate);
        res.json(cards);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi lấy card', details: err.message });
    }
};

const createOrUpdateCard = async (req, res) => {
    try {
        console.log(req.body);
        const card = await cardService.createOrUpdateCard(req.body);
        // console.log('✅ Card processed:', card);
        res.status(200).json(card);
    } catch (err) {
        console.error('❌ Error processing card:', err);
        res.status(500).json({ 
            error: 'Error processing card', 
            details: err.message,
            code: err.code 
        });
    }
};

const getCardByUrl = async (req, res) => {
    try {
        const { cardUrl } = req.params;
        const card = await cardService.getCardByUrl(cardUrl);
        if (!card) {
            return res.status(404).json({
                success: false,
                message: 'Card not found'
            });
        }
        res.json(card);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi lấy card', details: err.message });
    }
};

const getCardsOnTrello = async (req, res) => {
    try {
        const { listId } = req.params;
        console.log(listId);
        const cards = await trelloService.getCardsByList(listId);
        res.json(cards);
    }
    catch (err) {
        res.status(500).json({ error: 'Lỗi khi lấy card', details: err.message });
    }
}
module.exports = {
    createCard,
    getCards,
    createOrUpdateCard,
    getCardByUrl,
    getCardsOnTrello
};
