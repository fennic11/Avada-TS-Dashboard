import { API_URL, getAuthHeaders } from './apiConfig';

// Save cards to database
export const saveCardsToDatabase = async (cards) => {
    try {
        const response = await fetch(`${API_URL}/cards-create`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ cards })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to save cards');
        }

        return data;
    } catch (error) {
        console.error('Error saving cards to database:', error);
        throw error;
    }
};

// Get all cards from database
export const getCardsCreate = async (startDate, endDate) => {
    try {
        let url = `${API_URL}/cards-create`;
        const params = new URLSearchParams();

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to get cards');
        }

        return data;
    } catch (error) {
        console.error('Error getting cards:', error);
        throw error;
    }
};

// Get cards by specific date
export const getCardsByDate = async (date) => {
    try {
        const response = await fetch(`${API_URL}/cards-create/date/${date}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to get cards by date');
        }

        return data;
    } catch (error) {
        console.error('Error getting cards by date:', error);
        throw error;
    }
};
