import { API_URL, getAuthHeaders, handleResponse } from './apiConfig';

export const postErrorCards = async (cardData) => {
    try {
        console.log('Data before posting:', cardData);
        const response = await fetch(`${API_URL}/error-cards`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(cardData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to post error card');
        }

        const result = await response.json();

        if (!result || Object.keys(result).length === 0) {
            throw new Error('Empty response from server');
        }

        console.log('✅ Error card posted successfully:', result);
        return result;
    }
    catch (error) {
        console.error('❌ Error posting error card:', error);
        throw error;
    }
};

export const getErrorCardsByMonth = async (year, month) => {
    try {
        const response = await fetch(`${API_URL}/error-cards?year=${year}&month=${month}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to get error cards');
        }
        
        const result = await response.json();
        return result;
    }
    catch (error) {
        console.error('❌ Error getting error cards:', error);
        throw error;
    }
};