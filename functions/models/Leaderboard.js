const mongoose = require('mongoose');

const LeaderboardSchema = new mongoose.Schema({
    month: {
        type: Number,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    points: {
        type: Array,
        required: true,
        default: []
    }
}, {
    collection: 'leaderboard',
    dbName: 'AvadaTSTrelloDashboard'
});

module.exports = mongoose.model('Leaderboard', LeaderboardSchema); 