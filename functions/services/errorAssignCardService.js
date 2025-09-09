const ErrorAssignCard = require('../models/errorAssignCard');

const createErrorAssignCard = async (errorAssignCardData) => {
    // Handle array of error assign card data
        const errorAssignCards = await ErrorAssignCard.insertMany(errorAssignCardData);
        return errorAssignCards;
}

module.exports = {
    createErrorAssignCard
}