const WorkShift = require('../models/WorkShift');
const SLACK_WEBHOOK_URL = process.env.WEBHOOK_URL;
const trelloService = require('./trelloService');
const slackService = require('./slackService');

const LIST_1_ID = '63c7b1a68e5576001577d65c';
const LIST_2_ID = '63c7d18b4fe38a004885aadf';

// Hàm trích xuất link Slack từ description
const extractSlackLink = (description) => {
    if (!description) return null;
    
    console.log('Original Description:', description);
    
    // Decode URL first to handle %5D and other encoded characters
    let decodedDescription = description;
    try {
        decodedDescription = decodeURIComponent(description);
        console.log('Decoded Description:', decodedDescription);
    } catch (e) {
        console.log('Failed to decode URL, using original');
    }
    
    // Regex để tìm link Slack với nhiều format khác nhau
    // Bắt được cả: slack.com, app.slack.com, và các subdomain như avadaio.slack.com
    // Cũng xử lý cả format markdown [text](url)
    const slackRegex = /https?:\/\/(?:[a-zA-Z0-9-]+\.)?slack\.com\/[^\s\n\)\]%]+/g;
    const matches = decodedDescription.match(slackRegex);
    
    console.log('Slack regex matches:', matches);
    
    if (matches && matches.length > 0) {
        // Clean up the URL by removing any trailing characters
        let cleanUrl = matches[0];
        // Remove trailing characters that might be part of markdown or encoding
        cleanUrl = cleanUrl.replace(/[\)\]%].*$/, '');
        console.log('Clean URL:', cleanUrl);
        return cleanUrl;
    }
    
    return null;
};

const formatSlackMessage = (member, cards) => {
    let message = `*Trong ca này hãy fu những card này <@${member.slackId}>*\n\n`;
    
    if (cards.length > 0) {
        // Group cards by list
        const list1Cards = cards.filter(card => card.idList === LIST_1_ID);
        const list2Cards = cards.filter(card => card.idList === LIST_2_ID);

        if (list1Cards.length > 0) {
            message += `*Waiting to fix (from dev): ${list1Cards.length} cards*\n`;
            list1Cards.forEach(card => {
                const slackLink = extractSlackLink(card.desc);
                if (slackLink) {
                    message += `• ${card.name}`;
                    message += `  - <${card.shortUrl}|Link Trello>`;
                    message += `  - <${slackLink}|Link Slack>\n`;
                } else {
                    message += `• ${card.name} - <${card.shortUrl}|Link Trello>\n`;
                }
            });
            message += '\n';
        }

        if (list2Cards.length > 0) {
            message += `*Update workflow required (SLA: 2 days): ${list2Cards.length} cards*\n`;
            list2Cards.forEach(card => {
                const slackLink = extractSlackLink(card.desc);
                if (slackLink) {
                    message += `• ${card.name}`;
                    message += `  - <${card.shortUrl}|Link Trello>`;
                    message += `  - <${slackLink}|Link Slack>\n`;
                } else {
                    message += `• ${card.name} - <${card.shortUrl}|Link Trello>\n`;
                }
            });
        }
        message += '\n----------------------------------------------------';
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
            return null;
        }

        // Lọc những card có member trùng với thành viên
        const memberCards = validCards.filter(card => {
            const hasMember = card.idMembers.includes(member.trelloId);
            return hasMember;
        });

        // Kiểm tra kết quả lọc
        if (memberCards.length === 0) {
            return null;
        }

        // Format và gửi message
        const message = formatSlackMessage(member, memberCards);
        const response = await slackService.sendMessageToChannel(message, member.group);

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

const sendNotificationsToTSMembers = async (workShift) => {
    try {
        
        // Lấy cards từ cả 2 list
        const [list1Cards, list2Cards] = await Promise.all([
            trelloService.getCardsByList(LIST_1_ID),
            trelloService.getCardsByList(LIST_2_ID)
        ]);

        // Gộp cards từ cả 2 list vào một mảng
        const allCards = [...list1Cards, ...list2Cards];
        
        // Xử lý cards cho từng thành viên trong ca
        const processedMembers = await Promise.all(
            workShift.tsMembers.map(member => processCards(allCards, member)),
            workShift.csMembers.map(member => processCards(allCards, member))
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