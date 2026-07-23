const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  assignedRepId: { type: mongoose.Schema.Types.ObjectId, default: null },
  lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);