import { API_URL } from './apiConfig';

export const saveWorkShift = async (workShift) => {
    try {
        const response = await fetch(`${API_URL}/work-shift`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(workShift),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error saving work shift:', error);
        throw error;
    }
};

export const getWorkShift = async (date) => {
    try {
        const response = await fetch(`${API_URL}/work-shift?date=${date}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting work shift:', error);
        throw error;
    }
};