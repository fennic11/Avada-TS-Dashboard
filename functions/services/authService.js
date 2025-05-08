const User = require('../models/User');


const createOrUpdateUser = async (userData) => {
    try {
        const { email, apiKey, token } = userData;  

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('Email already exists');
        }

        // Create new user
        const user = new User({ 
            email,
            apiKey: apiKey || null,
            token: token || null
        });

        await user.save();

        return user;
    } catch (error) {
        throw error;
    }
};

const getUserByEmail = async (email) => {
    try {
        if (!email) {
            throw new Error('Email is required');
        }

        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('User not found');
        }

        // Không trả về password
        const userData = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            trelloId: user.trelloId,
            apiKey: user.apiKey,
            token: user.token
        };

        return userData;
    } catch (error) {
        console.error('Get user by email error:', error);
        throw error;
    }
};

module.exports = {
    createOrUpdateUser,
    getUserByEmail
}; 