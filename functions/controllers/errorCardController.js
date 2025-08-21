const errorCardService = require('../services/errorCardService');

const createOrUpdateErrorCard = async (req, res) => {
    try {
        const card = await errorCardService.createOrUpdateErrorCard(req.body);
        res.status(201).json(card);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi tạo card', details: err.message });
    }
};

module.exports = { createOrUpdateErrorCard };