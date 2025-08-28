const AssignCards = require('../models/AssignCards');

const assignCardService = {
    createAssignCards: async (assignCards) => { // create assign cards
        // Kiểm tra xem đã có data cho cùng shift VÀ ngày chưa
        const existingData = await AssignCards.findOne({
            shift: assignCards.shift,
            createdAt: assignCards.createdAt,
            memberId: assignCards.memberId
        });

        if (existingData) {
            console.log(`Data already exists for shift: ${assignCards.shift}, date: ${assignCards.createdAt}, member: ${assignCards.memberId}, skipping creation`);
            return {
                ...existingData.toObject(),
                message: 'Data already exists for this shift and date'
            };
        }

        // Nếu chưa có thì tạo mới
        console.log(`Creating new data for shift: ${assignCards.shift}, date: ${assignCards.createdAt}, member: ${assignCards.memberId}`);
        const newAssignCards = new AssignCards(assignCards);
        await newAssignCards.save();
        return newAssignCards;
    },
    getAssignCards: async () => {
        const assignCards = await AssignCards.find();
        return assignCards;
    },
    updateCardStatus: async (recordId, cardIndex, status) => {
        try {
            const record = await AssignCards.findById(recordId);
            if (!record) {
                throw new Error('Record not found');
            }

            if (cardIndex < 0 || cardIndex >= record.cards.length) {
                throw new Error('Invalid card index');
            }

            // Update the status of the specific card
            record.cards[cardIndex].status = status;
            await record.save();

            console.log(`Updated card ${cardIndex} status to ${status} for record ${recordId}`);
            return record;
        } catch (error) {
            console.error('Error updating card status:', error);
            throw error;
        }
    }
}

module.exports = assignCardService;