const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const chatRoutes = require('../routes/chat');
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app); // wrap express in an http server — Socket.io needs this
const io = new Server(server, {
  cors: {
    origin: '*', // replace with 'https://aureliusbank.com' in production
    methods: ['GET', 'POST']
  }
});

app.use(express.json());
app.use('/api', chatRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// This block is where all real-time chat logic lives
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Customer or rep joins a specific conversation room
  socket.on('joinConversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  // Reps join a shared room to get notified of new customer messages
  socket.on('joinRepDashboard', () => {
    socket.join('reps');
    console.log(`Socket ${socket.id} joined reps room`);
  });

  // Handling an incoming message
  socket.on('sendMessage', async ({ conversationId, senderId, senderType, text }) => {
    try {
      const message = await Message.create({ conversationId, senderId, senderType, text });
      await Conversation.findByIdAndUpdate(conversationId, { lastMessageAt: new Date() });

      io.to(conversationId).emit('newMessage', message);

      if (senderType === 'customer') {
        io.to('reps').emit('newCustomerMessage', { conversationId, message });
      }
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));