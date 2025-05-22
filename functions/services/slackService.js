const WEBHOOK_URL = process.env.WEBHOOK_URL;

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

const sendMessageToChannel = async (message) => {
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
