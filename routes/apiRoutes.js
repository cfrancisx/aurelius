const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validateTransfer } = require('../middleware/validation');
const UserController = require('../controllers/userController');
const { apiLimiter } = require('../middleware/security');

const router = express.Router();

module.exports = (db) => {
    const userController = new UserController(db);
    
    // User profile routes
    router.get('/user/profile', authenticateToken, (req, res) => userController.getProfile(req, res));
    router.put('/user/profile', authenticateToken, (req, res) => userController.updateProfile(req, res));
    
    // Account routes
    router.get('/user/accounts', authenticateToken, (req, res) => userController.getAccounts(req, res));
    router.get('/user/transactions/:account_number', authenticateToken, (req, res) => userController.getTransactions(req, res));
    
    // Transfer routes
    router.post('/transfer', authenticateToken, apiLimiter, validateTransfer, (req, res) => userController.transferFunds(req, res));
    
    // Beneficiary routes
    router.get('/user/beneficiaries', authenticateToken, (req, res) => userController.getBeneficiaries(req, res));
    router.post('/user/beneficiaries', authenticateToken, (req, res) => userController.addBeneficiary(req, res));
    router.delete('/user/beneficiaries/:id', authenticateToken, (req, res) => userController.deleteBeneficiary(req, res));
    
    // Loan routes
    router.get('/user/loans', authenticateToken, (req, res) => userController.getLoans(req, res));
    router.post('/user/loans', authenticateToken, (req, res) => userController.applyForLoan(req, res));
    
    // Card routes
    router.get('/user/cards', authenticateToken, (req, res) => userController.getCards(req, res));
    
    // Notification routes
    router.get('/user/notifications', authenticateToken, (req, res) => userController.getNotifications(req, res));
    router.put('/user/notifications/:id/read', authenticateToken, (req, res) => userController.markNotificationRead(req, res));
    
    // Support ticket routes
    router.get('/user/support-tickets', authenticateToken, (req, res) => userController.getSupportTickets(req, res));
    router.post('/user/support-tickets', authenticateToken, (req, res) => userController.createSupportTicket(req, res));
    
    // Savings goal routes
    router.get('/user/savings-goals', authenticateToken, (req, res) => userController.getSavingsGoals(req, res));
    router.post('/user/savings-goals', authenticateToken, (req, res) => userController.createSavingsGoal(req, res));
    
    // Statement routes
    router.get('/user/statement', authenticateToken, (req, res) => userController.getStatement(req, res));
    
    return router;
};