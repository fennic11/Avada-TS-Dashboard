const WEBHOOK_URL_TS = process.env.WEBHOOK_URL_TS;
const WEBHOOK_URL_CS1 = process.env.WEBHOOK_URL_CS1;
const WEBHOOK_URL_CS2 = process.env.WEBHOOK_URL_CS2;
const WEBHOOK_URL_CS3 = process.env.WEBHOOK_URL_CS3;
const WEBHOOK_URL_CS4 = process.env.WEBHOOK_URL_CS4;
const WEBHOOK_URL_TS_SHIFT_REPORT = process.env.FENNIC_WEBHOOK_URL;
const WEBHOOK_URL_TS_SHIFT_REPORT_2 = process.env.FENNIC_WEBHOOK_URL_TS_SHIFT_REPORT;


const sendMessage = async (message) => {
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: message
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.text();
    } catch (error) {
        console.error('Error sending message to Slack:', error);
        throw error;
    }
}

const sendMessageToChannel = async (message, group = 'ts') => {
    console.log('group', group);
    try {
        let webhookUrl;
        
        // Chọn webhook URL dựa trên group
        switch (group?.toUpperCase()) {
            case 'CS1':
                webhookUrl = WEBHOOK_URL_CS1;
                break;
            case 'CS2':
                webhookUrl = WEBHOOK_URL_CS2;
                break;
            case 'CS3':
                webhookUrl = WEBHOOK_URL_CS3;
                break;
            case 'CS4':
                webhookUrl = WEBHOOK_URL_CS4;
                break;
            case 'TS-SHIFT-REPORT':
                webhookUrl = WEBHOOK_URL_TS_SHIFT_REPORT;
                break;
            case 'TS-SHIFT-REPORT-2':
                webhookUrl = WEBHOOK_URL_TS_SHIFT_REPORT_2;
                break;
            default:
                webhookUrl = WEBHOOK_URL_TS;
                break;
        }
        
        console.log(`Using webhook URL for group: ${group}`, webhookUrl);
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: message
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.text();
    } catch (error) {
        console.error('Error sending message to Slack:', error);
        throw error;
    }
}

const getChannelId = async () => {
    try {
        // Since we're using webhook, we can't get channel list directly
        // Return a default channel ID that matches the webhook
        return {
            channels: [{
                id: 'C05T3KBNDEJ',
                name: 'general',
                is_channel: true,
                is_private: false
            }]
        };
    } catch (error) {
        console.error('Error getting channel info:', error);
        throw error;
    }
}

module.exports = {
    sendMessage,
    sendMessageToChannel,
    getChannelId
}
