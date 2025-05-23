const mongoose = require('mongoose');

const workShiftSchema = new mongoose.Schema({
    shiftName: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    tsMembers: {
        type: Array,
        required: true,
    }
}, {
    collection: 'workShifts',
    dbName: 'AvadaTSTrelloDashboard'
});

module.exports = mongoose.model('WorkShift', workShiftSchema);