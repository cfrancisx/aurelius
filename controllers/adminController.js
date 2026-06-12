const UserModel = require('../models/User');
const AccountModel = require('../models/Account');
const TransactionModel = require('../models/Transaction');
const AuditLogModel = require('../models/AuditLog');
const bcrypt = require('bcryptjs');

class AdminController {
    constructor(db) {
        this.db = db;
        this.userModel = new UserModel(db);
        this.accountModel = new AccountModel(db);
        this.transactionModel = new TransactionModel(db);
        this.auditLog = new AuditLogModel(db);
    }

    async getDashboardStats(req, res) {
        try {
            const totalUsers = await this.db.get('SELECT COUNT(*) as count FROM users');
            const totalAccounts = await this.db.get('SELECT COUNT(*) as count FROM accounts');
            const totalTransactions = await this.db.get('SELECT COUNT(*) as count FROM transactions');
            const totalVolume = await this.db.get('SELECT SUM(amount) as total FROM transactions WHERE status = "completed"');
            const pendingKYC = await this.db.get('SELECT COUNT(*) as count FROM users WHERE kyc_status = "pending"');
            const pendingLoans = await this.db.get('SELECT COUNT(*) as count FROM loans WHERE status = "pending"');
            
            // Get recent transactions
            const recentTransactions = await this.db.all(
                'SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10'
            );
            
            // Get daily active users (last 24 hours)
            const dailyActive = await this.db.get(
                `SELECT COUNT(DISTINCT user_id) as count FROM audit_logs 
                 WHERE action = 'user_login' AND timestamp >= datetime('now', '-1 day')`
            );
            
            res.json({
                total_users: totalUsers.count,
                total_accounts: totalAccounts.count,
                total_transactions: totalTransactions.count,
                total_volume: totalVolume.total || 0,
                pending_kyc: pendingKYC.count,
                pending_loans: pendingLoans.count,
                daily_active_users: dailyActive.count || 0,
                recent_transactions: recentTransactions
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch dashboard stats' });
        }
    }

    async getAllCustomers(req, res) {
        try {
            const { page = 1, limit = 20, search = '' } = req.query;
            const offset = (page - 1) * limit;
            
            let query = `
                SELECT u.*, a.account_number as main_account, a.available_balance, a.ledger_balance
                FROM users u
                LEFT JOIN accounts a ON u.id = a.user_id
                WHERE u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.account_number LIKE ?
                LIMIT ? OFFSET ?
            `;
            const searchTerm = `%${search}%`;
            const customers = await this.db.all(query, [searchTerm, searchTerm, searchTerm, searchTerm, limit, offset]);
            
            const total = await this.db.get(
                'SELECT COUNT(*) as count FROM users WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?',
                [searchTerm, searchTerm, searchTerm]
            );
            
            res.json({
                customers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total.count,
                    pages: Math.ceil(total.count / limit)
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch customers' });
        }
    }

    async getCustomerDetails(req, res) {
        try {
            const { id } = req.params;
            
            const customer = await this.userModel.findById(id);
            if (!customer) {
                return res.status(404).json({ error: 'Customer not found' });
            }
            
            const accounts = await this.accountModel.getUserAccounts(id);
            const transactions = await this.db.all(
                `SELECT t.* FROM transactions t 
                 WHERE t.sender_account IN (SELECT account_number FROM accounts WHERE user_id = ?)
                 OR t.receiver_account IN (SELECT account_number FROM accounts WHERE user_id = ?)
                 ORDER BY t.created_at DESC LIMIT 50`,
                [id, id]
            );
            
            const loans = await this.db.all('SELECT * FROM loans WHERE user_id = ?', [id]);
            const cards = await this.db.all('SELECT * FROM cards WHERE user_id = ?', [id]);
            const auditLogs = await this.auditLog.getUserActivity(id);
            
            res.json({
                customer,
                accounts,
                transactions,
                loans,
                cards,
                audit_logs: auditLogs
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch customer details' });
        }
    }

    async updateCustomerStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;
            
            await this.userModel.updateStatus(id, status);
            
            await this.auditLog.log(
                `account_status_changed_to_${status}`,
                id,
                req.user.id,
                req.ip,
                req.headers['user-agent'],
                reason
            );
            
            // Create notification for customer
            await this.db.run(
                `INSERT INTO notifications (user_id, title, message, status)
                 VALUES (?, ?, ?, ?)`,
                [id, 'Account Status Updated', `Your account has been ${status}. ${reason || ''}`, 'unread']
            );
            
            res.json({ success: true, message: `Account ${status} successfully` });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update account status' });
        }
    }

    async approveKYC(req, res) {
        try {
            const { id } = req.params;
            const { status, comments } = req.body;
            
            await this.userModel.updateKYC(id, status);
            
            await this.auditLog.log(
                `kyc_${status}`,
                id,
                req.user.id,
                req.ip,
                req.headers['user-agent'],
                comments
            );
            
            await this.db.run(
                `INSERT INTO notifications (user_id, title, message, status)
                 VALUES (?, ?, ?, ?)`,
                [id, 'KYC Verification Update', `Your KYC verification has been ${status}. ${comments || ''}`, 'unread']
            );
            
            res.json({ success: true, message: `KYC ${status} successfully` });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update KYC status' });
        }
    }

    async getAllTransactions(req, res) {
        try {
            const { page = 1, limit = 50, type, status } = req.query;
            const offset = (page - 1) * limit;
            
            let query = 'SELECT * FROM transactions WHERE 1=1';
            const params = [];
            
            if (type) {
                query += ' AND transaction_type = ?';
                params.push(type);
            }
            if (status) {
                query += ' AND status = ?';
                params.push(status);
            }
            
            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            
            const transactions = await this.db.all(query, params);
            
            const totalQuery = 'SELECT COUNT(*) as count FROM transactions';
            const total = await this.db.get(totalQuery);
            
            res.json({
                transactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total.count,
                    pages: Math.ceil(total.count / limit)
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch transactions' });
        }
    }

    async getAllLoans(req, res) {
        try {
            const { status } = req.query;
            let query = `
                SELECT l.*, u.first_name, u.last_name, u.email, u.account_number
                FROM loans l
                JOIN users u ON l.user_id = u.id
            `;
            
            if (status) {
                query += ' WHERE l.status = ?';
                const loans = await this.db.all(query, [status]);
                return res.json(loans);
            }
            
            const loans = await this.db.all(query);
            res.json(loans);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch loans' });
        }
    }

    async approveLoan(req, res) {
        try {
            const { id } = req.params;
            const { approved } = req.body;
            
            const status = approved ? 'approved' : 'rejected';
            
            await this.db.run(
                'UPDATE loans SET status = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, id]
            );
            
            const loan = await this.db.get('SELECT * FROM loans WHERE id = ?', [id]);
            
            if (approved) {
                // Credit the loan amount to user's account
                const userAccount = await this.db.get(
                    'SELECT account_number FROM accounts WHERE user_id = ?',
                    [loan.user_id]
                );
                
                if (userAccount) {
                    await this.db.run(
                        'UPDATE accounts SET available_balance = available_balance + ?, ledger_balance = ledger_balance + ? WHERE account_number = ?',
                        [loan.amount, loan.amount, userAccount.account_number]
                    );
                    
                    // Create transaction record
                    const reference = 'LOAN_' + Date.now();
                    await this.db.run(
                        `INSERT INTO transactions (sender_account, receiver_account, amount, transaction_type, reference, narration, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        ['SYSTEM', userAccount.account_number, loan.amount, 'credit', reference, `Loan disbursement - ${loan.amount}`, 'completed']
                    );
                }
            }
            
            await this.auditLog.log(
                `loan_${status}`,
                loan.user_id,
                req.user.id,
                req.ip,
                req.headers['user-agent'],
                `Loan amount: ${loan.amount}`
            );
            
            await this.db.run(
                `INSERT INTO notifications (user_id, title, message, status)
                 VALUES (?, ?, ?, ?)`,
                [loan.user_id, 'Loan Application Update', `Your loan application for $${loan.amount} has been ${status}`, 'unread']
            );
            
            res.json({ success: true, message: `Loan ${status} successfully` });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to process loan' });
        }
    }

    async getFraudAlerts(req, res) {
        try {
            // Detect suspicious transactions (large amounts, multiple small transactions, etc.)
            const suspiciousTransactions = await this.db.all(`
                SELECT * FROM transactions 
                WHERE amount > 10000 
                OR (created_at > datetime('now', '-1 hour') AND amount > 5000)
                ORDER BY created_at DESC
                LIMIT 50
            `);
            
            // Detect multiple failed logins
            const failedLogins = await this.db.all(`
                SELECT user_id, COUNT(*) as attempts, MAX(timestamp) as last_attempt
                FROM audit_logs
                WHERE action = 'failed_login' AND timestamp > datetime('now', '-1 hour')
                GROUP BY user_id
                HAVING attempts > 3
            `);
            
            // Large balance adjustments
            const largeAdjustments = await this.db.all(`
                SELECT * FROM balance_adjustments 
                WHERE adjustment_amount > 5000 AND created_at > datetime('now', '-1 day')
                ORDER BY created_at DESC
            `);
            
            res.json({
                suspicious_transactions: suspiciousTransactions,
                failed_logins: failedLogins,
                large_adjustments: largeAdjustments
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch fraud alerts' });
        }
    }

    async generateReport(req, res) {
        try {
            const { type, start_date, end_date } = req.body;
            
            let reportData = {};
            
            switch(type) {
                case 'transactions':
                    reportData = await this.db.all(
                        `SELECT DATE(created_at) as date, 
                                COUNT(*) as count, 
                                SUM(amount) as total,
                                SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END) as credits,
                                SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END) as debits
                         FROM transactions
                         WHERE DATE(created_at) BETWEEN ? AND ?
                         GROUP BY DATE(created_at)
                         ORDER BY date DESC`,
                        [start_date, end_date]
                    );
                    break;
                    
                case 'customers':
                    reportData = await this.db.all(
                        `SELECT DATE(created_at) as date, COUNT(*) as new_customers
                         FROM users
                         WHERE DATE(created_at) BETWEEN ? AND ?
                         GROUP BY DATE(created_at)
                         ORDER BY date DESC`,
                        [start_date, end_date]
                    );
                    break;
                    
                case 'revenue':
                    reportData = await this.db.all(
                        `SELECT DATE(created_at) as date, SUM(amount * 0.01) as revenue
                         FROM transactions
                         WHERE DATE(created_at) BETWEEN ? AND ? AND transaction_type = 'transfer'
                         GROUP BY DATE(created_at)
                         ORDER BY date DESC`,
                        [start_date, end_date]
                    );
                    break;
            }
            
            await this.auditLog.log(
                'report_generated',
                null,
                req.user.id,
                req.ip,
                req.headers['user-agent'],
                `Report type: ${type}, Period: ${start_date} to ${end_date}`
            );
            
            res.json({ report: reportData, type, start_date, end_date });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to generate report' });
        }
    }

    async getSystemSettings(req, res) {
        try {
            const settings = await this.db.get('SELECT * FROM system_settings WHERE id = 1');
            res.json(settings || {});
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch settings' });
        }
    }

    async updateSystemSettings(req, res) {
        try {
            const settings = req.body;
            
            await this.db.run(`
                INSERT OR REPLACE INTO system_settings (id, maintenance_mode, transfer_limit, savings_interest_rate, loan_interest_rate, updated_at)
                VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [settings.maintenance_mode || 0, settings.transfer_limit || 10000, settings.savings_interest_rate || 2.5, settings.loan_interest_rate || 8.5]);
            
            await this.auditLog.log('settings_updated', null, req.user.id, req.ip, req.headers['user-agent']);
            
            res.json({ success: true, message: 'Settings updated successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update settings' });
        }
    }
}

module.exports = AdminController;