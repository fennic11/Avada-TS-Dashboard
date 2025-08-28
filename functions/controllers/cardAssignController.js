const assignCardService = require('../services/assignCardService');

const assignCardsController = {
    createAssignCards: async (req, res) => {
        try {
            const assignCards = req.body;
            const newAssignCards = await assignCardService.createAssignCards(assignCards);
            res.status(201).json(newAssignCards);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    getAssignCards: async (req, res) => {
        try {
            const assignCards = await assignCardService.getAssignCards();
            res.status(200).json(assignCards);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = assignCardsController;