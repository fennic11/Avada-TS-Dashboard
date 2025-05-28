const mongoose = require('mongoose');

const LeaderboardSchema = new mongoose.Schema({
    month: {
        type: String,
        required: true
    },
    year: {
        type: String,
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