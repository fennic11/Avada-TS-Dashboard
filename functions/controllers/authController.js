const authService = require('../services/authService');



const createOrUpdateUser = async (req, res) => {
    try {
        const { email, apiKey, token } = req.body;
        
        // Log request data
        console.log('Create or update user request:', req.body);

        // Validate required fields
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email, password and name are required'
            });
        }

        // Tạo object chứa thông tin user
        const userData = {
            email,
            apiKey,
            token
        };

        const result = await authService.createOrUpdateUser(userData);
        console.log('Create or update user result:', result);

        res.status(201).json({
            success: true,
            data: result,
            message: result.isNew ? 'User created successfully' : 'User updated successfully'
        });
    } catch (error) {
        console.error('Create or update user error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Error creating/updating user'
        });
    }
};

const getUserByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        
        // Log request
        console.log('Get user by email request:', { email });

        // Validate input
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const user = await authService.getUserByEmail(email);
        console.log('Get user result:', user);

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(404).json({
            success: false,
            message: error.message || 'User not found'
        });
    }
};

module.exports = {
    createOrUpdateUser,
    getUserByEmail
}; 