const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const UserModel = require('../models/User');
const AuditLogModel = require('../models/AuditLog');

class AuthController {
    constructor(db) {
        this.db = db;
        this.userModel = new UserModel(db);
        this.auditLog = new AuditLogModel(db);
    }
    
    async register(req, res) {
        try {
            const { email, password, first_name, last_name, phone, address, date_of_birth } = req.body;
            
            const existingUser = await this.userModel.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ error: 'Email already registered' });
            }
            
            const user = await this.userModel.create({
                email, password, first_name, last_name, phone, address, date_of_birth
            });
            
            await this.auditLog.log('user_registered', user.id, null, req.ip, req.headers['user-agent']);
            
            const token = jwt.sign({ id: user.id, email, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '24h' });
            
            res.status(201).json({ token, user: { id: user.id, email, first_name, last_name, account_number: user.account_number } });
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
                await this.auditLog.log('failed_login', user.id, null, req.ip, req.headers['user-agent']);
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
           if (user.account_status === 'suspended') {
    return res.status(403).json({
        error: 'Account suspended. Contact support.'
    });
}

            if (user.account_status === 'closed') {
    return res.status(403).json({
        error: 'Account closed.'
    });
}
            
            await this.auditLog.log('user_login', user.id, null, req.ip, req.headers['user-agent']);
            
            const token = jwt.sign({ id: user.id, email: user.email, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '24h' });
            
            res.json({ 
                token, 
                user: { 
                    id: user.id, 
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
            
            const admin = await this.db.get('SELECT * FROM admins WHERE email = ?', [email]);
            if (!admin) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            const validPassword = await bcrypt.compare(password, admin.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            await this.auditLog.log('admin_login', null, admin.id, req.ip, req.headers['user-agent']);
            
            const token = jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
            
            res.json({ token, admin: { id: admin.id, username: admin.username, email: admin.email, role: admin.role } });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Login failed' });
        }
    }
}

module.exports = AuthController;