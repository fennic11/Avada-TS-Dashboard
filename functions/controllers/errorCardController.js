const errorCardService = require('../services/errorCardService');

const createErrorCard = async (req, res) => {
    try {
        const card = await errorCardService.createErrorCard(req.body);
        res.status(201).json(card);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi tạo card', details: err.message });
    }
};

const getErrorCardsByMonth = async (req, res) => {
    try {
        const { year, month } = req.query;
        const errorCards = await errorCardService.getErrorCardsByMonth(year, month);
        res.json(errorCards);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi lấy card', details: err.message });
    }
};

module.exports = { createErrorCard, getErrorCardsByMonth };