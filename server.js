const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const multer = require('multer');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const { connectDatabase } = require('./database/mongodb');
const { seedMongoDB } = require('./database/mongoSeed');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'https://firstaurelius.co.uk'],
        credentials: true
    }
});

const PORT = process.env.PORT || 3000;

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Accept images and PDFs
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF allowed.'));
        }
    }
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    frameguard: true,
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'https://firstaurelius.co.uk'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make upload middleware available globally
app.use((req, res, next) => {
    req.uploadMultiple = upload.fields([
        { name: 'id_document', maxCount: 1 },
        { name: 'selfie_photo', maxCount: 1 }
    ]);
    next();
});

// Verify MongoDB URI is available
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
    console.error('❌ MONGODB_URI environment variable is not set!');
    process.exit(1);
}

// Session management with MongoDB Store
app.use(session({
    secret: process.env.SESSION_SECRET || 'aurelius-bank-session-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
        mongoUrl: mongoUri,
        touchAfter: 24 * 3600 // lazy session update interval (24 hours)
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io chat logic
io.on('connection', (socket) => {
    socket.on('joinConversation', (conversationId) => {
        socket.join(conversationId);
    });

    socket.on('joinRepDashboard', () => {
        socket.join('reps');
    });

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
});

// Database initialization and route setup
(async () => {
    await connectDatabase();
    await seedMongoDB();
    
    // Routes (register after DB is initialized)
    const authRoutes = require('./routes/authRoutesMongo');
    const apiRoutes = require('./routes/apiRoutesMongo');
    const adminRoutes = require('./routes/adminRoutesMongo');
    const pageRoutes = require('./routes/pageRoutes');
    const chatRoutes = require('./routes/chatRoutes');
    
    app.use('/auth', authRoutes());
    app.use('/api', apiRoutes());
    app.use('/api/admin', adminRoutes());
    app.use('/api/chat', chatRoutes());
    app.use('/', pageRoutes);
    
    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ error: 'Something went wrong!' });
    });

    // 404 handler
    app.use((req, res) => {
        res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
    });

    // Start server after routes are registered
    server.listen(PORT, () => {
        console.log(`🚀 Aurelius Bank running on https://localhost:${PORT}`);
        console.log(`📊 Admin Panel: https://localhost:${PORT}/admin`);
        console.log(`🏦 Customer Portal: https://localhost:${PORT}/login`);
    });
})();