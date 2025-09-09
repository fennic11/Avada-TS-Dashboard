const mongoose = require('mongoose');

const errorAssignCardSchema = new mongoose.Schema({
    idMemberCreator: { type: String, required: true },
    idMemberAssigned: { type: String, required: true },
    date: { type: Date, required: true },
    card: { type: Object, required: true },
    note: { type: String, required: false },
}, {
    collection: 'errorAssignCards', // 👈 tên collection cố định trong MongoDB
    dbName: 'AvadaTSTrelloDashboard' // 👈 tên database   
});

module.exports = mongoose.model('ErrorAssignCard', errorAssignCardSchema);