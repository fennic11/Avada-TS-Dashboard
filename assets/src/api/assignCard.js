import { API_URL, getAuthHeaders, handleResponse } from './apiConfig';

const assignCard = {
    createAssignCards: async (assignCards) => {
        try {
        const response = await fetch(`${API_URL}/assign-cards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(assignCards)
            });
            return response.json();
        } catch (error) {
            console.error(error);
            return error;
        }
    },
    getAssignCards: async () => {
        try {
            const response = await fetch(`${API_URL}/assign-cards`, {
                headers: getAuthHeaders()
            });
            return response.json();
        } catch (error) {
            console.error(error);
            return error;
        }
    },
    updateAssignCards: async (assignCards) => {
        try {
            const response = await fetch(`${API_URL}/assign-cards`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(assignCards)
            });
            return response.json();
        } catch (error) {
            console.error(error);
            return error;
        }
    },
    updateCardStatus: async (recordId, cardIndex, status, requestText = '') => {
        try {
            const response = await fetch(`${API_URL}/assign-cards/${recordId}/card-status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ cardIndex, status, requestText })
            });
            return response.json();
        } catch (error) {
            console.error(error);
            return error;
        }
    }
}

const errorAssignCard = {
    createErrorAssignCards: async (errorAssignCards) => {
        try {
            const response = await fetch(`${API_URL}/error-assign-cards`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(errorAssignCards)
            });
            return response.json();
        } catch (error) {
            console.error(error);
            return error;
        }
    }
}

export default assignCard;
export { errorAssignCard };