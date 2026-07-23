const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  senderType: { type: String, enum: ['customer', 'rep'], required: true },
  text: { type: String, required: true },
  readAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);