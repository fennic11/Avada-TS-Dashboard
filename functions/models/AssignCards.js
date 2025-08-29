const mongoose = require('mongoose');

const AssignCardsSchema = new mongoose.Schema({
    shift: {
        type: String,
        required: true
    },
    memberId: {
        type: String,
        required: true
    },
    createdAt: {
        type: String,
        required: true
    },
    cards: [{
        cardName: {
            type: String,
            required: true
        },
        cardUrl: {
            type: String,
            required: true
        },
        idMember: {
            type: String,
            required: true
        },
        status: {
            type: String,
            default: 'approved'
        },
        requestText: {
            type: String,
            default: ''
        }
    }]
}, {
    collection: 'assignCards', // 👈 tên collection cố định trong MongoDB
    dbName: 'AvadaTSTrelloDashboard' // 👈 tên database   
});

module.exports = mongoose.model('AssignCards', AssignCardsSchema);
