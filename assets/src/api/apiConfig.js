const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Helper function to handle API responses
const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        throw data;
    }
    return data;
};

// Helper function to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// Log API URL for debugging
console.log('Current API URL:', API_URL);
console.log('Environment:', process.env.REACT_APP_ENV);

export { API_URL, handleResponse, getAuthHeaders }; 