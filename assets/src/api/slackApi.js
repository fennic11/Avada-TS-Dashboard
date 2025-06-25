import { API_URL } from './apiConfig';

export const sendMessageToChannel = async (message, group) => {
    try {
        const response = await fetch(`${API_URL}/slack/sendMessageToChannel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message, group })
        });

        if (!response.ok) {
            throw new Error('Failed to send message to Slack');
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending message to Slack:', error);
        throw error;
    }
}

export const getChannelId = async () => {
    try {
        const response = await fetch(`${API_URL}/slack/getChannelId`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get channel ID');
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting channel ID:', error);
        throw error;
    }
}

export const sendMessage = async (message) => {
    try {
        const response = await fetch(`${API_URL}/slack/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}