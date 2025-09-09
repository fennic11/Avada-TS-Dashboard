const ErrorAssignCard = require('../models/errorAssignCard');

const createErrorAssignCard = async (errorAssignCardData) => {
    // Handle array of error assign card data
    if (Array.isArray(errorAssignCardData)) {
        const errorAssignCards = await ErrorAssignCard.insertMany(errorAssignCardData);
        return errorAssignCards;
    } else {
        // Handle single object
        const errorAssignCard = new ErrorAssignCard(errorAssignCardData);
        await errorAssignCard.save();
        return errorAssignCard;
    }
}

module.exports = {
    createErrorAssignCard
}