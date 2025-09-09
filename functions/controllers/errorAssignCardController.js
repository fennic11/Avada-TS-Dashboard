const errorAssignCardService = require('../services/errorAssignCardService');

const errorAssignCardController = {
    createErrorAssignCards: async (req, res) => {
        const errorAssignCards = req.body;
        const newErrorAssignCards = await errorAssignCardService.createErrorAssignCard(errorAssignCards);
        res.status(201).json(newErrorAssignCards);
    },
    getErrorAssignCards: async (req, res) => {
        const errorAssignCards = await errorAssignCardService.getErrorAssignCards();
        res.status(200).json(errorAssignCards);
    },
    updateErrorAssignCards: async (req, res) => {
        const { recordId } = req.params;
        const { cardIndex, status, requestText } = req.body;
        const updatedErrorAssignCards = await errorAssignCardService.updateErrorAssignCards({
            recordId,
            cardIndex,
            status,
            requestText
        });
        res.status(200).json(updatedErrorAssignCards);
    },
    updateCardStatus: async (req, res) => {
        const { recordId } = req.params;
        const { cardIndex, status, requestText } = req.body;
        const updatedErrorAssignCards = await errorAssignCardService.updateCardStatus({
            recordId,
            cardIndex,
            status,
            requestText
        });
        res.status(200).json(updatedErrorAssignCards);
    },
    deleteErrorAssignCards: async (req, res) => {
        const { recordId } = req.params;
        const deletedErrorAssignCards = await errorAssignCardService.deleteErrorAssignCards(recordId);
        res.status(200).json(deletedErrorAssignCards);
    }
}

module.exports = errorAssignCardController;