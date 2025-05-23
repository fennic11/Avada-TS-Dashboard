const WorkShift = require('../models/WorkShift');
const SLACK_WEBHOOK_URL = process.env.WEBHOOK_URL;
const trelloService = require('./trelloService');
const slackService = require('./slackService');

const LIST_1_ID = '63c7b1a68e5576001577d65c';
const LIST_2_ID = '63c7d18b4fe38a004885aadf';

const formatSlackMessage = (member, cards) => {
    let message = `*Check những card cần fu này trước khi làm việc nhé <@${member.slackId}>*\n\n`;
    
    if (cards.length > 0) {
        // Group cards by list
        const list1Cards = cards.filter(card => card.idList === LIST_1_ID);
        const list2Cards = cards.filter(card => card.idList === LIST_2_ID);

        if (list1Cards.length > 0) {
            message += `*Waiting to fix (from dev):*\n`;
            list1Cards.forEach(card => {
                message += `• ${card.name} - ${card.shortUrl}\n`;
            });
            message += '\n';
        }

        if (list2Cards.length > 0) {
            message += `*Update workflow required (SLA: 2 days):*\n`;
            list2Cards.forEach(card => {
                message += `• ${card.name} - ${card.shortUrl}\n`;
            });
        }
        message += '----------------------------------------------------';
    } else {
        message += "You don't have any cards at the moment.";
    }

    return message;
};

const processCards = async (cards, member) => {
    try {
        // Kiểm tra input
        if (!cards || !Array.isArray(cards)) {
            throw new Error('Invalid cards data: cards must be an array');
        }

        if (!member || !member.slackId || !member.trelloId) {
            throw new Error('Invalid member data: member must have slackId and trelloId');
        }

        // Kiểm tra cards có đúng format không
        const validCards = cards.filter(card => {
            return card && 
                   typeof card === 'object' && 
                   card.idMembers && 
                   Array.isArray(card.idMembers) &&
                   card.name &&
                   card.shortUrl &&
                   card.idList;
        });

        if (validCards.length === 0) {
            console.log(`No valid cards found for member ${member.trelloId}`);
            return null;
        }

        // Lọc những card có member trùng với thành viên
        const memberCards = validCards.filter(card => {
            const hasMember = card.idMembers.includes(member.trelloId);
            if (hasMember) {
                console.log(`Found card for member ${member.trelloId}:`, {
                    name: card.name,
                    idList: card.idList
                });
            }
            return hasMember;
        });

        // Kiểm tra kết quả lọc
        if (memberCards.length === 0) {
            console.log(`No cards found for member ${member.trelloId}`);
            return null;
        }

        // Format và gửi message
        const message = formatSlackMessage(member, memberCards);
        const response = await slackService.sendMessageToChannel(message);

        if (!response || !response.ok) {
            throw new Error(`Failed to send Slack message: ${response?.error || 'Unknown error'}`);
        }

        return {
            success: true,
            memberId: member.trelloId,
            cardsCount: memberCards.length,
            message: message
        };

    } catch (error) {
        console.error(`Error processing cards for member ${member?.trelloId}:`, error);
        throw error;
    }
};

const sendNotificationsToTSMembers = async (date, shiftName) => {
    try {
        // Tìm ca trực theo date và shiftName
        const workShift = await WorkShift.findOne({ 
            date: date,
            shiftName: shiftName
        });

        if (!workShift) {
            console.log(`No work shift found for date ${date} and shift ${shiftName}`);
            return null;
        }
        
        console.log('Found work shift:', workShift);
        
        // Lấy cards từ cả 2 list
        const [list1Cards, list2Cards] = await Promise.all([
            trelloService.getCardsByList(LIST_1_ID),
            trelloService.getCardsByList(LIST_2_ID)
        ]);

        // Gộp cards từ cả 2 list vào một mảng
        const allCards = [...list1Cards, ...list2Cards];
        
        // Xử lý cards cho từng thành viên trong ca
        const processedMembers = await Promise.all(
            workShift.tsMembers.map(member => processCards(allCards, member))
        );

        console.log('Processed members:', processedMembers);

        return {
            shiftName: workShift.shiftName,
            members: processedMembers.filter(result => result !== null)
        };
    } catch (error) {
        console.error('Error sending Slack notification:', error);
        throw error;
    }
};

module.exports = {
    sendNotificationsToTSMembers
}; 