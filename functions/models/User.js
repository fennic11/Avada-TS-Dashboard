const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    apiKey: {
        type: String,
        required: false
    },
    token: {
        type: String,
        required: false
    }
}, {
    collection: 'users',
    dbName: 'AvadaTSTrelloDashboard'
});

module.exports = mongoose.model('User', UserSchema); 