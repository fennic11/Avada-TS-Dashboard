import { API_URL, getAuthHeaders, handleResponse } from './apiConfig';

const errorAssignCardApi = {
    createErrorAssignCards: async (errorAssignCards) => {
        const response = await fetch(`${API_URL}/error-assign-cards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(errorAssignCards)
        });
        return response.json();
    },

    getErrorAssignCards: async () => {
        const response = await fetch(`${API_URL}/error-assign-cards`, {
            method: 'GET',
            headers: {
                ...getAuthHeaders()
            }
        });
        return handleResponse(response);
    }
}

export default errorAssignCardApi;