const mongoose = require('mongoose');

const DevCardSchema = new mongoose.Schema({
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
    resolutionTime: {
        type: Number,
        default: null,
    },
    resolutionTimeDev: {
        type: Number,
        default: null,
    },
    firstActionTime: {
        type: Number,
        default: null,
    },
    members: {
        type: Array,
        default: [],
    },
    labels: {
        type: Array,
        default: [],
    }
}, {
    collection: 'devResolutionTimes', // 👈 tên collection cố định trong MongoDB
    dbName: 'AvadaTSTrelloDashboard' // 👈 tên database   
});

module.exports = mongoose.model('DevCard', DevCardSchema);
