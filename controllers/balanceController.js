const { v4: uuidv4 } = require('uuid');
const AccountModel = require('../models/Account');
const TransactionModel = require('../models/Transaction');
const AuditLogModel = require('../models/AuditLog');

class BalanceController {
    constructor(db) {
        this.db = db;
        this.accountModel = new AccountModel(db);
        this.transactionModel = new TransactionModel(db);
        this.auditLog = new AuditLogModel(db);
    }
    
    async creditAccount(req, res) {
        try {
            const { account_number, amount, reason } = req.body;
            const adminId = req.user.id;
            
            const account = await this.accountModel.getAccountByNumber(account_number);
            if (!account) {
                return res.status(404).json({ error: 'Account not found' });
            }
            
            const previousBalance = account.available_balance;
            const newBalance = previousBalance + parseFloat(amount);
            
            // Update balance
            await this.accountModel.updateBalance(account_number, amount, 'credit');
            
            // Create transaction record
            const reference = uuidv4();
            await this.transactionModel.create({
                sender_account: 'SYSTEM',
                receiver_account: account_number,
                amount: amount,
                transaction_type: 'credit',
                reference: reference,
                narration: `Admin credit: ${reason}`
            });
            
            // Log balance adjustment
            await this.db.run(
                `INSERT INTO balance_adjustments (admin_id, user_id, account_number, adjustment_type, previous_balance, adjustment_amount, new_balance, reason)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [adminId, account.user_id, account_number, 'credit', previousBalance, amount, newBalance, reason]
            );
            
            await this.auditLog.log('balance_credited', account.user_id, adminId, req.ip, req.headers['user-agent'], `Amount: ${amount}, Reason: ${reason}`);
            
            res.json({ success: true, previous_balance: previousBalance, new_balance: newBalance });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to credit account' });
        }
    }
    
    async debitAccount(req, res) {
        try {
            const { account_number, amount, reason } = req.body;
            const adminId = req.user.id;
            
            const account = await this.accountModel.getAccountByNumber(account_number);
            if (!account) {
                return res.status(404).json({ error: 'Account not found' });
            }
            
            if (account.available_balance < amount) {
                return res.status(400).json({ error: 'Insufficient funds' });
            }
            
            const previousBalance = account.available_balance;
            const newBalance = previousBalance - parseFloat(amount);
            
            // Update balance
            await this.accountModel.updateBalance(account_number, amount, 'debit');
            
            // Create transaction record
            const reference = uuidv4();
            await this.transactionModel.create({
                sender_account: account_number,
                receiver_account: 'SYSTEM',
                amount: amount,
                transaction_type: 'debit',
                reference: reference,
                narration: `Admin debit: ${reason}`
            });
            
            // Log balance adjustment
            await this.db.run(
                `INSERT INTO balance_adjustments (admin_id, user_id, account_number, adjustment_type, previous_balance, adjustment_amount, new_balance, reason)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [adminId, account.user_id, account_number, 'debit', previousBalance, amount, newBalance, reason]
            );
            
            await this.auditLog.log('balance_debited', account.user_id, adminId, req.ip, req.headers['user-agent'], `Amount: ${amount}, Reason: ${reason}`);
            
            res.json({ success: true, previous_balance: previousBalance, new_balance: newBalance });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to debit account' });
        }
    }
    
    async setExactBalance(req, res) {
        try {
            const { account_number, new_balance, reason } = req.body;
            const adminId = req.user.id;
            
            const account = await this.accountModel.getAccountByNumber(account_number);
            if (!account) {
                return res.status(404).json({ error: 'Account not found' });
            }
            
            const previousBalance = account.available_balance;
            const amount = parseFloat(new_balance) - previousBalance;
            
            // Update balance
            await this.db.run(
                'UPDATE accounts SET available_balance = ?, ledger_balance = ? WHERE account_number = ?',
                [new_balance, new_balance, account_number]
            );
            
            // Log balance adjustment
            await this.db.run(
                `INSERT INTO balance_adjustments (admin_id, user_id, account_number, adjustment_type, previous_balance, adjustment_amount, new_balance, reason)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [adminId, account.user_id, account_number, 'set_exact', previousBalance, amount, new_balance, reason]
            );
            
            await this.auditLog.log('balance_set', account.user_id, adminId, req.ip, req.headers['user-agent'], `New balance: ${new_balance}, Reason: ${reason}`);
            
            res.json({ success: true, previous_balance: previousBalance, new_balance: new_balance });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to set balance' });
        }
    }
    
    async getBalanceStats(req, res) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const adjustments = await this.db.get(
                `SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN adjustment_type = 'credit' THEN 1 ELSE 0 END) as credits,
                    SUM(CASE WHEN adjustment_type = 'debit' THEN 1 ELSE 0 END) as debits,
                    SUM(CASE WHEN adjustment_type = 'credit' THEN adjustment_amount ELSE 0 END) as credit_amount,
                    SUM(CASE WHEN adjustment_type = 'debit' THEN adjustment_amount ELSE 0 END) as debit_amount
                 FROM balance_adjustments 
                 WHERE DATE(created_at) = ?`,
                [today]
            );
            
            const recentAdjustments = await this.db.all(
                `SELECT ba.*, u.first_name, u.last_name, a.username as admin_name
                 FROM balance_adjustments ba
                 JOIN users u ON ba.user_id = u.id
                 JOIN admins a ON ba.admin_id = a.id
                 ORDER BY ba.created_at DESC
                 LIMIT 20`
            );
            
            res.json({ stats: adjustments, recent: recentAdjustments });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to get stats' });
        }
    }
}

module.exports = BalanceController;