const { body, validationResult } = require('express-validator');

const validateRegistration = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('first_name').notEmpty().trim(),
    body('last_name').notEmpty().trim(),
    body('phone').notEmpty(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateTransfer = [
    body('amount').isFloat({ min: 0.01 }),
    body('receiver_account').notEmpty(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = { validateRegistration, validateTransfer };