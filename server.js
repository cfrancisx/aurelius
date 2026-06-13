const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const dotenv = require('dotenv');
const { connectDatabase } = require('./database/mongodb');
const { seedMongoDB } = require('./database/mongoSeed');

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
    secret: process.env.SESSION_SECRET || 'aurelius-bank-session-secret-key',
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
(async () => {
    await connectDatabase();
    await seedMongoDB();
    
    // Routes (register after DB is initialized)
    const authRoutes = require('./routes/authRoutesMongo');
    const apiRoutes = require('./routes/apiRoutesMongo');
    const adminRoutes = require('./routes/adminRoutesMongo');
    const pageRoutes = require('./routes/pageRoutes');
    
    app.use('/auth', authRoutes());
    app.use('/api', apiRoutes());
    app.use('/api/admin', adminRoutes());
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