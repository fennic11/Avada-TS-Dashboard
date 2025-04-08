const authService = require('../services/authService');

const register = async (req, res) => {
    try {
        const { email, password, name, role, trelloId } = req.body;
        
        // Log request body
        console.log('Register request body:', req.body);
        console.log('TrelloId from request:', trelloId);

        // Validate input
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                message: 'Email, password and name are required'
            });
        }

        const result = await authService.register({ email, password, name, role, trelloId });
        console.log('Register result:', result);

        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Error creating account'
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const result = await authService.login(email, password);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({
            success: false,
            message: error.message || 'Invalid credentials'
        });
    }
};

module.exports = {
    login,
    register
}; 