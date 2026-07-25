const express = require('express');
const jwt = require('jsonwebtoken');
const UserController = require('../controllers/userControllerMongo');

// Middleware to verify JWT
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = function() {
    const router = express.Router();
    const userController = new UserController();

    // Protected routes
    router.use(verifyToken);

    router.get('/accounts', (req, res) => userController.getAccounts(req, res));
    router.get('/user-profile', (req, res) => userController.getUserProfile(req, res));
    router.post('/transaction-pin', (req, res) => userController.setTransactionPin(req, res));
    router.post('/transfer', (req, res) => userController.transfer(req, res));
    router.get('/transactions', (req, res) => userController.getTransactions(req, res));
    router.get('/balance', (req, res) => userController.getBalance(req, res));
    router.get('/user/statement', (req, res) => userController.getStatement(req, res));
    
    // KYC upload with file handling
    router.post('/kyc/upload', (req, res, next) => {
        req.uploadMultiple(req, res, (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            userController.uploadKYCDocument(req, res);
        });
    });

    return router;
};
