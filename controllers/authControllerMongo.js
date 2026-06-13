const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Admin, Account, AuditLog } = require('../database/mongodb');
const UserModel = require('../models/UserMongo');

class AuthController {
    constructor() {
        this.userModel = new UserModel();
        this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    }

    async register(req, res) {
        try {
            const { email, password, first_name, last_name, phone, address, date_of_birth } = req.body;

            const existingUser = await this.userModel.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const accountNumber = 'ACC' + Math.floor(Math.random() * 1000000000);
            const userAccountNumber = 'AUB' + Math.floor(Math.random() * 1000000000);

            const user = await User.create({
                account_number: accountNumber,
                first_name,
                last_name,
                email,
                phone,
                password_hash: hashedPassword,
                address,
                date_of_birth,
                account_status: 'active'
            });

            // Create account
            await Account.create({
                user_id: user._id,
                account_number: userAccountNumber,
                currency: 'GBP',
                available_balance: 0,
                ledger_balance: 0,
                status: 'active'
            });

            await AuditLog.create({
                action: 'user_registered',
                user_id: user._id,
                ip_address: req.ip,
                user_agent: req.headers['user-agent']
            });

            const token = jwt.sign(
                { id: user._id, email, role: 'user' },
                this.jwtSecret,
                { expiresIn: '24h' }
            );

            res.status(201).json({
                token,
                user: {
                    id: user._id,
                    email,
                    first_name,
                    last_name,
                    account_number: user.account_number
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;

            const user = await this.userModel.findByEmail(email);
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                await AuditLog.create({
                    action: 'failed_login',
                    user_id: user._id,
                    ip_address: req.ip,
                    user_agent: req.headers['user-agent']
                });
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            if (user.account_status !== 'active') {
                return res.status(403).json({ error: 'Account is not active' });
            }

            await AuditLog.create({
                action: 'user_login',
                user_id: user._id,
                ip_address: req.ip,
                user_agent: req.headers['user-agent']
            });

            const token = jwt.sign(
                { id: user._id, email: user.email, role: 'user' },
                this.jwtSecret,
                { expiresIn: '24h' }
            );

            res.json({
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    account_number: user.account_number
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Login failed' });
        }
    }

    async adminLogin(req, res) {
        try {
            const { email, password } = req.body;

            const admin = await Admin.findOne({ email });
            if (!admin) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const validPassword = await bcrypt.compare(password, admin.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            await AuditLog.create({
                action: 'admin_login',
                admin_id: admin._id,
                ip_address: req.ip,
                user_agent: req.headers['user-agent']
            });

            const token = jwt.sign(
                { id: admin._id, email: admin.email, role: 'admin' },
                this.jwtSecret,
                { expiresIn: '8h' }
            );

            res.json({
                token,
                admin: {
                    id: admin._id,
                    username: admin.username,
                    email: admin.email,
                    role: admin.role
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Login failed' });
        }
    }
}

module.exports = AuthController;
