const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema({
    trelloId: {
        type: String,
        required: true,
        unique: true
    },
    checkIn: {
        type: Boolean,
        required: true
    },
}, {
    collection: 'sections',
    dbName: 'AvadaTSTrelloDashboard'
});

module.exports = mongoose.model('Section', SectionSchema); 