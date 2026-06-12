const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const dotenv = require('dotenv');
const { initDatabase } = require('./database/init');
const { seedDatabase } = require('./database/seed');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
    origin: 'http://localhost:3000',
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

// Session management
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Database initialization and route setup
let db;
(async () => {
    db = await initDatabase();
    await seedDatabase();
    app.locals.db = db;
    
    // Routes (register after DB is initialized)
    const authRoutes = require('./routes/authRoutes');
    const apiRoutes = require('./routes/apiRoutes');
    const adminRoutes = require('./routes/adminRoutes');
    const pageRoutes = require('./routes/pageRoutes');
    
    app.use('/auth', authRoutes(db));
    app.use('/api', apiRoutes(db));
    app.use('/api/admin', adminRoutes(db));
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
    app.listen(PORT, () => {
        console.log(`🚀 Aurelius Bank running on https://localhost:${PORT}`);
        console.log(`📊 Admin Panel: https://localhost:${PORT}/admin`);
        console.log(`🏦 Customer Portal: https://localhost:${PORT}/login`);
    });
})();