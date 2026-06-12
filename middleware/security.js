const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Too many login attempts, please try again later' }
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Too many requests' }
});

const sanitizeInput = (req, res, next) => {
    for (let key in req.body) {
        if (typeof req.body[key] === 'string') {
            req.body[key] = req.body[key].trim().replace(/[<>]/g, '');
        }
    }
    next();
};

module.exports = { loginLimiter, apiLimiter, sanitizeInput };