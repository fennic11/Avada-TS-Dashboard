const mongoose = require('mongoose');

const ErrorCardSchema = new mongoose.Schema({
    cardName: String,
    cardId: {
        type: String,
        unique: true,
        required: true
    },
    cardUrl: {
        type: String,
        unique: true,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    members: {
        type: Array,
        default: [],
    },
    labels: {
        type: Array,
        default: [],
    },
    note: {
        type: String,
        default: '',
    },
    penaltyPoints: {
        type: Number,
        default: 0,
    }
}, {
    collection: 'errorCards', // 👈 tên collection cố định trong MongoDB
    dbName: 'AvadaTSTrelloDashboard' // 👈 tên database   
});

module.exports = mongoose.model('ErrorCard', ErrorCardSchema);      
