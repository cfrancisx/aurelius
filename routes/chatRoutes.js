const router = require('express').Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Customer starts or resumes a conversation
router.post('/conversations', async (req, res) => {
  try {
    const { customerId } = req.body;
    let convo = await Conversation.findOne({ customerId, status: 'open' });
    if (!convo) convo = await Conversation.create({ customerId });
    res.json(convo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Load message history when chat opens
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.id }).sort('createdAt');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rep dashboard: list all open conversations
router.get('/conversations', async (req, res) => {
  try {
    const convos = await Conversation.find({ status: 'open' }).sort('-lastMessageAt');
    res.json(convos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = () => router;