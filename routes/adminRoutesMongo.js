const express = require('express');
const jwt = require('jsonwebtoken');
const BalanceController = require('../controllers/balanceControllerMongo');
const AdminController = require('../controllers/adminControllerMongo');

// Middleware to verify admin JWT
function verifyAdminToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = function() {
    const router = express.Router();
    const balanceController = new BalanceController();
    const adminController = new AdminController();

    // Protected routes
    router.use(verifyAdminToken);

    // Balance management
    router.post('/balance/credit', (req, res) => balanceController.creditAccount(req, res));
    router.post('/balance/debit', (req, res) => balanceController.debitAccount(req, res));
    router.post('/balance/set-exact', (req, res) => balanceController.setExactBalance(req, res));
    router.get('/balance/stats', (req, res) => balanceController.getBalanceStats(req, res));

    // Admin operations
    router.get('/customers', (req, res) => adminController.getCustomers(req, res));

    // KYC review
    router.get('/customers/:id/kyc-documents', (req, res) => adminController.getKYCDocuments(req, res));
    router.put('/customers/:id/kyc', (req, res) => adminController.updateKYCStatus(req, res));

    router.get('/transactions', (req, res) => adminController.getTransactions(req, res));
    router.get('/audit-logs', (req, res) => adminController.getAuditLogs(req, res));
    router.get('/dashboard/stats', (req, res) => adminController.getDashboardStats(req, res));
    
    // Transaction approval/decline
    router.get('/transactions/pending', (req, res) => adminController.getPendingTransactions(req, res));
    router.post('/transactions/approve', (req, res) => adminController.approveTransaction(req, res));
    router.post('/transactions/decline', (req, res) => adminController.declineTransaction(req, res));

    return router;
};
