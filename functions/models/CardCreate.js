const mongoose = require('mongoose');

const CardCreateSchema = new mongoose.Schema({
  cardId: {
    type: String,
    required: true,
  },
  cardName: {
    type: String,
    required: true,
  },
  cardUrl: {
    type: String,
    required: true,
  },
  dueComplete: {
    type: Boolean,
    default: false
  },
  labels: {
    type: [String],
    default: [],
  },
  members: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  collection: 'cardsCreate',
  dbName: 'AvadaTSTrelloDashboard',
});

module.exports = mongoose.model('CardCreate', CardCreateSchema);
