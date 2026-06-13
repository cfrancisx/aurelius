const express = require('express');
const AuthController = require('../controllers/authControllerMongo');

module.exports = function() {
    const router = express.Router();
    const authController = new AuthController();

    router.post('/register', (req, res) => authController.register(req, res));
    router.post('/login', (req, res) => authController.login(req, res));
    router.post('/admin/login', (req, res) => authController.adminLogin(req, res));

    return router;
};
