const express = require('express');
const AuthController = require('../controllers/authController');
const { validateRegistration } = require('../middleware/validation');
const { loginLimiter } = require('../middleware/security');

const router = express.Router();

module.exports = (db) => {
    const authController = new AuthController(db);
    
    router.post('/register', validateRegistration, (req, res) => authController.register(req, res));
    router.post('/login', loginLimiter, (req, res) => authController.login(req, res));
    router.post('/admin/login', loginLimiter, (req, res) => authController.adminLogin(req, res));
    
    return router;
};

