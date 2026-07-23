const express = require('express');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public pages
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/index.html'));
});

router.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/about.html'));
});

router.get('/personal', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/personal-banking.html'));
});

router.get('/business', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/business-banking.html'));
});

router.get('/corporate', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/corporate-banking.html'));
});

router.get('/savings', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/savings.html'));
});

router.get('/investments', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/investments.html'));
});

router.get('/loans', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/loans.html'));
});

router.get('/credit-cards', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/credit-cards.html'));
});

router.get('/security', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/security.html'));
});

router.get('/digital-banking', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/digital-banking.html'));
});

router.get('/careers', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/careers.html'));
});

router.get('/newsroom', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/newsroom.html'));
});

router.get('/investor-relations', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/investor-relations.html'));
});

router.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/contact.html'));
});

router.get('/help', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/help.html'));
});

router.get('/faq', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/faq.html'));
});

router.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/privacy.html'));
});

router.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/terms.html'));
});

router.get('/cookies', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/cookies.html'));
});

// Auth pages
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/login.html'));
});

router.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/register.html'));
});

router.get('/register/id-verification', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/register-id-verification.html'));
});

router.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/forgot-password.html'));
});

router.get('/reset-password/:token', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/reset-password.html'));
});

router.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin-login.html'));
});

// Customer dashboard pages (client-side authentication in dashboard.js)
router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard/index.html'));
});

router.get('/dashboard/overview', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard/overview.html'));
});

router.get('/dashboard/accounts', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard/accounts.html'));
});

router.get('/dashboard/transfers', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard/transfers.html'));
});

router.get('/dashboard/statements', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard/statements.html'));
});

router.get('/dashboard/payments', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard/payments.html'));
});

router.get('/dashboard/cards', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard/cards.html'));
});

router.get('/dashboard/loans', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard/loans.html'));
});

router.get('/dashboard/support', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard/support.html'));
});

router.get('/dashboard/settings', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard/settings.html'));
});

router.get('/dashboard/kyc', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard/kyc.html'));
});

// Admin pages
router.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/index.html'));
});

router.get('/admin/customers', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/customers.html'));
});

router.get('/admin/accounts', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/accounts.html'));
});

router.get('/admin/transactions', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/transactions.html'));
});

router.get('/admin/balance-management', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/balance-management.html'));
});

router.get('/admin/kyc', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/kyc.html'));
});

router.get('/admin/loans', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/loans.html'));
});

router.get('/admin/audit-logs', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/audit-logs.html'));
});

router.get('/admin/fraud', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/fraud.html'));
});

router.get('/admin/settings', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/settings.html'));
});

router.get('/admin/overview', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../views/admin/overview.html'));
});

router.get('/admin/customers', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../views/admin/customers.html'));
});

router.get('/admin/accounts', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../views/admin/accounts.html'));
});

router.get('/admin/transactions', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../views/admin/transactions.html'));
});

router.get('/admin/balance-management', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../views/admin/balance-management.html'));
});

router.get('/admin/kyc', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../views/admin/kyc.html'));
});

router.get('/admin/loans', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../views/admin/loans.html'));
});

router.get('/admin/audit-logs', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../views/admin/audit-logs.html'));
});

router.get('/admin/fraud', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../views/admin/fraud.html'));
});

router.get('/admin/reports', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../views/admin/reports.html'));
});

router.get('/admin/settings', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '../views/admin/settings.html'));
});

router.get('/admin/support', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard/support-rep.html'));
});
// 404 page
router.get('/404', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/404.html'));
});

// Catch-all redirect to 404
router.get('*', (req, res) => {
    res.redirect('/404');
});

module.exports = router;