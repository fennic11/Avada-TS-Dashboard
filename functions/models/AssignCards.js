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
    cards: {
        type: Array,
        default: [],
    }
}, {
    collection: 'assignCards', // 👈 tên collection cố định trong MongoDB
    dbName: 'AvadaTSTrelloDashboard' // 👈 tên database   
});

module.exports = mongoose.model('AssignCards', AssignCardsSchema);
