const { createOrUpdateCard, getAllCards } = require('../services/devCardService');

const createOrUpdateDevCard = async (req, res) => {
    try {
        const card = await createOrUpdateCard(req.body);
        res.status(201).json(card);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi tạo card', details: err.message });
    }
};

const getDevCards = async (req, res) => {
    try {
        const startDate = new Date(`${req.query.start}T00:00:00.000Z`);
        const endDate = new Date(`${req.query.end}T23:59:59.999Z`);
        const cards = await getAllCards(startDate, endDate);
        res.json(cards);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi lấy card', details: err.message });
    }
}


module.exports = {
    createOrUpdateDevCard,
    getDevCards
};