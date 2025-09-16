const mongoose = require('mongoose');

const ErrorCardSchema = new mongoose.Schema({
    uniqueId: {
        type: String,
        unique: true,
        required: true
    },
    cardName: String,
    cardId: {
        type: String,
        required: true
    },
    cardUrl: {
        type: String,
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
    },
    penaltyId: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        default: 'approved',
    },
    requestText: {
        type: String,
        default: '',
    }
}, {
    collection: 'errorCards', // 👈 tên collection cố định trong MongoDB
    dbName: 'AvadaTSTrelloDashboard' // 👈 tên database   
});

module.exports = mongoose.model('ErrorCard', ErrorCardSchema);      
