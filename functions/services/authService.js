const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (userData) => {
    try {
        const { email, password, name, role, trelloId } = userData;
        
        // Log user data
        console.log('Auth service user data:', userData);
        console.log('TrelloId from user data:', trelloId);

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('Email already exists');
        }

        // Check if trelloId already exists
        if (trelloId) {
            const existingTrelloUser = await User.findOne({ trelloId });
            if (existingTrelloUser) {
                throw new Error('Trello ID already exists');
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            email,
            password: hashedPassword,
            name,
            role: role || 'user',
            trelloId: trelloId || null
        });

        console.log('User to be saved:', user);

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        const result = {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                trelloId: trelloId || null
            },
            token
        };

        console.log('Final result:', result);
        return result;
    } catch (error) {
        console.error('Auth service error:', error);
        throw error;
    }
};

const login = async (email, password) => {
    try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // Return user info and token
        return {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                trelloId: user.trelloId
            },
            token
        };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    login,
    register
}; 