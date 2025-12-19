const trelloService = require('./trelloService');
const slackService = require('./slackService');

const LIST_1_ID = '63c7b1a68e5576001577d65c';
const LIST_2_ID = '63c7d18b4fe38a004885aadf';

// Rate limiting: delay between Slack API calls (ms)
const SLACK_DELAY_MS = 1000;

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function with timeout for API calls
const withTimeout = (promise, timeoutMs = 30000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        )
    ]);
};

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
        // Null check for workShift
        if (!workShift) {
            console.log('No work shift data available');
            return { shiftName: null, members: [] };
        }

        const tsMembers = workShift.tsMembers || [];
        const csMembers = workShift.csMembers || [];
        const allMembers = [...tsMembers, ...csMembers];

        if (allMembers.length === 0) {
            console.log('No members found in work shift');
            return { shiftName: workShift.shiftName, members: [] };
        }

        console.log(`Processing notifications for ${allMembers.length} members`);

        // Lấy cards từ cả 2 list với timeout
        const [list1Cards, list2Cards] = await Promise.all([
            withTimeout(trelloService.getCardsByList(LIST_1_ID), 30000),
            withTimeout(trelloService.getCardsByList(LIST_2_ID), 30000)
        ]);

        // Null check for cards
        const safeList1Cards = Array.isArray(list1Cards) ? list1Cards : [];
        const safeList2Cards = Array.isArray(list2Cards) ? list2Cards : [];
        const allCards = [...safeList1Cards, ...safeList2Cards];

        console.log(`Found ${allCards.length} cards to process`);

        if (allCards.length === 0) {
            console.log('No cards found in lists');
            return { shiftName: workShift.shiftName, members: [] };
        }

        // Process members sequentially with rate limiting to avoid Slack API overload
        const processedMembers = [];

        for (let i = 0; i < allMembers.length; i++) {
            const member = allMembers[i];
            try {
                console.log(`Processing member ${i + 1}/${allMembers.length}: ${member.name}`);
                const result = await processCards(allCards, member);
                if (result) {
                    processedMembers.push(result);
                }

                // Add delay between Slack API calls to prevent rate limiting
                if (i < allMembers.length - 1) {
                    await delay(SLACK_DELAY_MS);
                }
            } catch (memberError) {
                console.error(`Error processing member ${member.name}:`, memberError.message);
                // Continue with next member instead of failing entire batch
            }
        }

        console.log(`Successfully processed ${processedMembers.length} members`);

        return {
            shiftName: workShift.shiftName,
            members: processedMembers
        };
    } catch (error) {
        console.error('Error sending Slack notification:', error);
        // Return empty result instead of throwing to prevent server crash
        return { shiftName: null, members: [], error: error.message };
    }
};

module.exports = {
    sendNotificationsToTSMembers
}; 