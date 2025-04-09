import { API_URL, getAuthHeaders, handleResponse } from './apiConfig';

export const postCards = async (cardData) => {
    try {
        console.log('Data before posting:', cardData);
        const response = await fetch(`${API_URL}/cards`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(cardData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to post card');
        }

        const result = await response.json();
        
        if (!result || Object.keys(result).length === 0) {
            throw new Error('Empty response from server');
        }

        console.log('✅ Card posted successfully:', result);
        return result;
    } catch (error) {
        console.error('❌ Error posting card:', error);
        throw error;
    }
};

export const getResolutionTimes = async (startDate, endDate) => {
    try {
        const queryParams = new URLSearchParams({
            start: startDate,
            end: endDate
        });
        
        const response = await fetch(`${API_URL}/cards?${queryParams}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to get resolution times');
        }
        
        const data = await response.json();
        return data;
    } catch (err) {
        console.error("❌ Lỗi khi gọi API:", err);
        return [];
    }
};


