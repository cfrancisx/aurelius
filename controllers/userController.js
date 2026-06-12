const AccountModel = require('../models/Account');
const TransactionModel = require('../models/Transaction');
const AuditLogModel = require('../models/AuditLog');
const { v4: uuidv4 } = require('uuid');

class UserController {
    constructor(db) {
        this.db = db;
        this.accountModel = new AccountModel(db);
        this.transactionModel = new TransactionModel(db);
        this.auditLog = new AuditLogModel(db);
    }

    async getProfile(req, res) {
        try {
            const user = await this.db.get(
                'SELECT id, account_number, first_name, last_name, email, phone, address, date_of_birth, account_type, account_status, kyc_status, created_at FROM users WHERE id = ?',
                [req.user.id]
            );
            res.json(user);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch profile' });
        }
    }

    async updateProfile(req, res) {
        try {
            const { first_name, last_name, phone, address } = req.body;
            
            await this.db.run(
                'UPDATE users SET first_name = ?, last_name = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [first_name, last_name, phone, address, req.user.id]
            );
            
            await this.auditLog.log('profile_updated', req.user.id, null, req.ip, req.headers['user-agent']);
            
            res.json({ success: true, message: 'Profile updated successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update profile' });
        }
    }

    async getAccounts(req, res) {
        try {
            const accounts = await this.accountModel.getUserAccounts(req.user.id);
            res.json(accounts);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch accounts' });
        }
    }

    async getTransactions(req, res) {
        try {
            const { account_number } = req.params;
            const transactions = await this.transactionModel.getUserTransactions(account_number);
            res.json(transactions);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch transactions' });
        }
    }

    async transferFunds(req, res) {
        try {
            const { receiver_account, amount, narration } = req.body;
            
            // Get sender's account
            const senderAccounts = await this.accountModel.getUserAccounts(req.user.id);
            const senderAccount = senderAccounts[0];
            
            if (!senderAccount) {
                return res.status(404).json({ error: 'Sender account not found' });
            }
            
            if (senderAccount.available_balance < amount) {
                return res.status(400).json({ error: 'Insufficient funds' });
            }
            
            // Get receiver's account
            const receiverAccount = await this.accountModel.getAccountByNumber(receiver_account);
            if (!receiverAccount) {
                return res.status(404).json({ error: 'Receiver account not found' });
            }
            
            // Perform transfer
            await this.accountModel.updateBalance(senderAccount.account_number, amount, 'debit');
            await this.accountModel.updateBalance(receiverAccount.account_number, amount, 'credit');
            
            // Create transaction record
            const reference = uuidv4();
            await this.transactionModel.create({
                sender_account: senderAccount.account_number,
                receiver_account: receiver_account,
                amount: amount,
                transaction_type: 'transfer',
                reference: reference,
                narration: narration || 'Funds transfer'
            });
            
            // Log the transaction
            await this.auditLog.log('transfer_made', req.user.id, null, req.ip, req.headers['user-agent'], `Amount: ${amount}, To: ${receiver_account}`);
            
            // Create notification for receiver
            await this.db.run(
                `INSERT INTO notifications (user_id, title, message, status)
                 VALUES (?, ?, ?, ?)`,
                [receiverAccount.user_id, 'Funds Received', `You received £${amount} from ${senderAccount.account_number}`, 'unread']
            );
            
            res.json({ 
                success: true, 
                reference: reference,
                message: 'Transfer completed successfully' 
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Transfer failed' });
        }
    }

    async getBeneficiaries(req, res) {
        try {
            const beneficiaries = await this.db.all(
                'SELECT * FROM beneficiaries WHERE user_id = ? ORDER BY created_at DESC',
                [req.user.id]
            );
            res.json(beneficiaries);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch beneficiaries' });
        }
    }

    async addBeneficiary(req, res) {
        try {
            const { beneficiary_name, bank_name, account_number } = req.body;
            
            await this.db.run(
                `INSERT INTO beneficiaries (user_id, beneficiary_name, bank_name, account_number)
                 VALUES (?, ?, ?, ?)`,
                [req.user.id, beneficiary_name, bank_name, account_number]
            );
            
            await this.auditLog.log('beneficiary_added', req.user.id, null, req.ip, req.headers['user-agent']);
            
            res.json({ success: true, message: 'Beneficiary added successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to add beneficiary' });
        }
    }

    async deleteBeneficiary(req, res) {
        try {
            const { id } = req.params;
            
            await this.db.run('DELETE FROM beneficiaries WHERE id = ? AND user_id = ?', [id, req.user.id]);
            
            res.json({ success: true, message: 'Beneficiary deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete beneficiary' });
        }
    }

    async applyForLoan(req, res) {
        try {
            const { amount, interest_rate, repayment_period } = req.body;
            
            // Calculate monthly payment (simple interest calculation)
            const monthly_rate = interest_rate / 100 / 12;
            const monthly_payment = amount * monthly_rate * Math.pow(1 + monthly_rate, repayment_period) / (Math.pow(1 + monthly_rate, repayment_period) - 1);
            
            const result = await this.db.run(
                `INSERT INTO loans (user_id, amount, interest_rate, repayment_period, monthly_payment, status)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.user.id, amount, interest_rate, repayment_period, monthly_payment, 'pending']
            );
            
            await this.auditLog.log('loan_applied', req.user.id, null, req.ip, req.headers['user-agent'], `Amount: ${amount}`);
            
            res.json({ 
                success: true, 
                loan_id: result.lastID,
                monthly_payment: monthly_payment,
                message: 'Loan application submitted successfully' 
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to submit loan application' });
        }
    }

    async getLoans(req, res) {
        try {
            const loans = await this.db.all(
                'SELECT * FROM loans WHERE user_id = ? ORDER BY created_at DESC',
                [req.user.id]
            );
            res.json(loans);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch loans' });
        }
    }

    async getCards(req, res) {
        try {
            const cards = await this.db.all(
                'SELECT id, card_number, expiry_date, card_type, status, created_at FROM cards WHERE user_id = ?',
                [req.user.id]
            );
            res.json(cards);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch cards' });
        }
    }

    async getNotifications(req, res) {
        try {
            const notifications = await this.db.all(
                'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
                [req.user.id]
            );
            res.json(notifications);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    }

    async markNotificationRead(req, res) {
        try {
            const { id } = req.params;
            await this.db.run(
                'UPDATE notifications SET status = "read" WHERE id = ? AND user_id = ?',
                [id, req.user.id]
            );
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to mark notification as read' });
        }
    }

    async createSupportTicket(req, res) {
        try {
            const { subject, message } = req.body;
            
            await this.db.run(
                `INSERT INTO support_tickets (user_id, subject, message, status)
                 VALUES (?, ?, ?, ?)`,
                [req.user.id, subject, message, 'open']
            );
            
            await this.auditLog.log('support_ticket_created', req.user.id, null, req.ip, req.headers['user-agent']);
            
            res.json({ success: true, message: 'Support ticket created successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to create support ticket' });
        }
    }

    async getSupportTickets(req, res) {
        try {
            const tickets = await this.db.all(
                'SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC',
                [req.user.id]
            );
            res.json(tickets);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch support tickets' });
        }
    }

    async createSavingsGoal(req, res) {
        try {
            const { goal_name, target_amount, deadline } = req.body;
            
            await this.db.run(
                `INSERT INTO savings_goals (user_id, goal_name, target_amount, deadline, status)
                 VALUES (?, ?, ?, ?, ?)`,
                [req.user.id, goal_name, target_amount, deadline, 'active']
            );
            
            res.json({ success: true, message: 'Savings goal created successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to create savings goal' });
        }
    }

    async getSavingsGoals(req, res) {
        try {
            const goals = await this.db.all(
                'SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC',
                [req.user.id]
            );
            res.json(goals);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch savings goals' });
        }
    }

    async getStatement(req, res) {
        try {
            const { account_number, from_date, to_date } = req.query;
            
            const transactions = await this.db.all(
                `SELECT * FROM transactions 
                 WHERE (sender_account = ? OR receiver_account = ?)
                 AND DATE(created_at) BETWEEN ? AND ?
                 ORDER BY created_at DESC`,
                [account_number, account_number, from_date, to_date]
            );
            
            const account = await this.accountModel.getAccountByNumber(account_number);
            
            res.json({
                account,
                transactions,
                period: { from_date, to_date },
                generated_at: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to generate statement' });
        }
    }
}

module.exports = UserController;