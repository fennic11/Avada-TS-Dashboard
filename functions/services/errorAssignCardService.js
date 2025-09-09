const ErrorAssignCard = require('../models/errorAssignCard');

const createErrorAssignCard = async (errorAssignCardData) => {
    // Handle array of error assign card data, insert sequentially to avoid bulk errors
    try {
        if (!Array.isArray(errorAssignCardData)) {
            const doc = new ErrorAssignCard(errorAssignCardData);
            await doc.save();
            return doc;
        }

        const savedDocs = await Promise.all(
            errorAssignCardData.map(async (data) => {
                const doc = new ErrorAssignCard(data);
                await doc.save();
                return doc;
            })
        );

        return savedDocs;
    } catch (error) {
        console.error('Error creating error assign card:', error);
        throw error;
    }
}

module.exports = {
    createErrorAssignCard
}