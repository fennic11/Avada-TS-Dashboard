const API_URL = 'https://avada-ts-dashboard-1.onrender.com/api';

// Login user
export const login = async (email, password) => {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw data;
        }

        return data;
    } catch (error) {
        throw error || { message: 'An error occurred during login' };
    }
};

// Register new user
export const register = async (userData) => {
    try {
        console.log(userData);
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw data;
        }

        return data;
    } catch (error) {
        throw error || { message: 'An error occurred during registration' };
    }
};

// Get current user from token
export const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        return JSON.parse(userStr);
    }
    return null;
};

// Save user data to localStorage
export const saveUserData = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
};

// Remove user data from localStorage
export const logout = () => {
    localStorage.removeItem('user');
};

// Check if user is authenticated
export const isAuthenticated = () => {
    return getCurrentUser() !== null;
};

// Get auth header for API requests
export const getAuthHeader = () => {
    const user = getCurrentUser();
    if (user && user.token) {
        return { Authorization: `Bearer ${user.token}` };
    }
    return {};
};
