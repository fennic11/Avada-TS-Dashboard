// index.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const bodyParser = require('body-parser');
const { startSlackNotificationCron } = require('./cron/slackNotificationCron');
const { startPerformanceTsCron } = require('./cron/performanceTsCron');
// Import routes
const api = require('./routes/api');
const notionRoutes = require('./routes/notionRoutes');
const webhookRoutes = require('./routes/webhook');
const app = express();
const port = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'https://avada-ts-dashboard.vercel.app',
        'avada-ts-dashboard-production.up.railway.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Connect to MongoDB
connectDB().then(() => {
    console.log('MongoDB connected successfully');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Health check endpoint
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        message: 'Server is running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api', api);
app.use('/webhook', webhookRoutes);
// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Handle specific types of errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            error: err.message
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
            error: err.message
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Start server
const server = app.listen(port, () => {
    console.log(`Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    // Start cron jobs
    startSlackNotificationCron();
    // startPerformanceTsCron();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    // Close server & exit process
    server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Close server & exit process
    server.close(() => process.exit(1));
});

module.exports = app;
