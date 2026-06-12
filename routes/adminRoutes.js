const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const BalanceController = require('../controllers/balanceController');
const UserModel = require('../models/User');
const TransactionModel = require('../models/Transaction');
const AuditLogModel = require('../models/AuditLog');

const router = express.Router();

module.exports = (db) => {
    const balanceController = new BalanceController(db);
    const userModel = new UserModel(db);
    const transactionModel = new TransactionModel(db);
    const auditLog = new AuditLogModel(db);
    
    // Balance management routes
    router.post('/balance/credit', authenticateToken, requireAdmin, (req, res) => balanceController.creditAccount(req, res));
    router.post('/balance/debit', authenticateToken, requireAdmin, (req, res) => balanceController.debitAccount(req, res));
    router.post('/balance/set-exact', authenticateToken, requireAdmin, (req, res) => balanceController.setExactBalance(req, res));
    router.get('/balance/stats', authenticateToken, requireAdmin, (req, res) => balanceController.getBalanceStats(req, res));
    
    // Customer management
    router.get('/customers', authenticateToken, requireAdmin, async (req, res) => {
        try {
            const customers = await userModel.getAll();
            res.json(customers);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch customers' });
        }
    });
    
    router.put('/customers/:id/kyc', authenticateToken, requireAdmin, async (req, res) => {
        try {
            await userModel.updateKYC(req.params.id, req.body.status);
            await auditLog.log('kyc_updated', req.params.id, req.user.id, req.ip, req.headers['user-agent']);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update KYC' });
        }
    });
    
    router.put('/customers/:id/status', authenticateToken, requireAdmin, async (req, res) => {
        try {
            await userModel.updateStatus(req.params.id, req.body.status);
            await auditLog.log('account_status_changed', req.params.id, req.user.id, req.ip, req.headers['user-agent']);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update status' });
        }
    });
    
    // Transaction monitoring
    router.get('/transactions', authenticateToken, requireAdmin, async (req, res) => {
        try {
            const transactions = await db.all(
                'SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100'
            );
            res.json(transactions);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch transactions' });
        }
    });
    
    // Audit logs
    router.get('/audit-logs', authenticateToken, requireAdmin, async (req, res) => {
        try {
            const logs = await auditLog.getLogs();
            res.json(logs);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch audit logs' });
        }
    });
    
    // Dashboard stats
    router.get('/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
        try {
            const totalCustomers = await db.get('SELECT COUNT(*) as count FROM users');
            const totalTransactions = await db.get('SELECT COUNT(*) as count FROM transactions');
            const totalVolume = await db.get('SELECT SUM(amount) as total FROM transactions');
            const pendingKYC = await db.get('SELECT COUNT(*) as count FROM users WHERE kyc_status = "pending"');
            
            res.json({
                total_customers: totalCustomers.count,
                total_transactions: totalTransactions.count,
                total_volume: totalVolume.total || 0,
                pending_kyc: pendingKYC.count
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch stats' });
        }
    });
    
    return router;
};