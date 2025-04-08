const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    trelloId: {
        type: String,
        required: false
    }
}, {
    collection: 'users',
    dbName: 'AvadaTSTrelloDashboard'
});

module.exports = mongoose.model('User', UserSchema); 