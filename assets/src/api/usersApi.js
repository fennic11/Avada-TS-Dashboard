import { API_URL, getAuthHeaders, handleResponse } from './apiConfig';
import { ROLES } from '../utils/roles';
import members from '../data/members.json';

// Simulate user data storage
let currentUser = null;

// Login user
export const login = (userData) => {
    // Add role to user data based on email domain or other criteria
    const userWithRole = {
        ...userData,
        role: determineUserRole(userData.email)
    };
    currentUser = userWithRole;
    localStorage.setItem('user', JSON.stringify(userWithRole));
    return userWithRole;
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
    if (currentUser) return currentUser;
    
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        return currentUser;
    }
    return null;
};

// Save user data to localStorage with complete information from members.json
export const saveUserData = (userData) => {
    const memberInfo = members.find(m => m.email && m.email.toLowerCase() === userData.email.toLowerCase());
    const completeUserData = {
        ...userData,
        fullName: memberInfo?.fullName || userData.name || '',
        username: memberInfo?.username || '',
        avatarUrl: memberInfo?.avatarUrl || '',
        initials: memberInfo?.initials || '',
        role: determineUserRole(userData.email)
    };
    currentUser = completeUserData;
    localStorage.setItem('user', JSON.stringify(completeUserData));
    return completeUserData;
};

// Remove user data from localStorage
export const logout = () => {
    currentUser = null;
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

// Helper function to determine user role based on email from members.json
const determineUserRole = (email) => {
    if (!email) return ROLES.BA; // Default role
    
    const member = members.find(m => m.email && m.email.toLowerCase() === email.toLowerCase());
    if (member && member.role) {
        switch(member.role.toLowerCase()) {
            case 'admin':
                return ROLES.ADMIN;
            case 'ts':
                return ROLES.TS;
            case 'ba':
                return ROLES.BA;
            case 'ts-lead':
                return ROLES.TS_LEAD;
            default:
                return ROLES.BA;
        }
    }
    return ROLES.BA; // Default role if member not found or no role specified
};

// Update user information
export const updateUser = async (email, updateData) => {
    try {
        const response = await fetch(`${API_URL}/auth/user`, {
            method: 'PUT',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({...updateData, email}),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw data;
        }

        // Nếu update thành công và là user hiện tại, cập nhật localStorage
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.email === email) {
            const updatedUser = {
                ...currentUser,
                ...updateData
            };
            saveUserData(updatedUser);
        }

        return data;
    } catch (error) {
        throw error || { message: 'An error occurred while updating user' };
    }
};

// Get user by email
export const getUserByEmail = async (email) => {
    try {
        const response = await fetch(`${API_URL}/auth/user/${email}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw data;
        }

        // Nếu lấy được user, thêm thông tin từ members.json
        if (data.success && data.data) {
            const memberInfo = members.find(m => m.email && m.email.toLowerCase() === email.toLowerCase());
            const completeUserData = {
                ...data.data,
                fullName: memberInfo?.fullName || data.data.name || '',
                username: memberInfo?.username || '',
                avatarUrl: memberInfo?.avatarUrl || '',
                initials: memberInfo?.initials || '',
                role: determineUserRole(email),
                trelloId: memberInfo?.id || ''
            };
            return completeUserData;
        }

        return data;
    } catch (error) {
        throw error || { message: 'An error occurred while fetching user' };
    }
};
