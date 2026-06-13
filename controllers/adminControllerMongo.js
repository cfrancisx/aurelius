const { User, Account, Transaction, BalanceAdjustment, Admin } = require('../database/mongodb');

class AdminController {
    async getCustomers(req, res) {
        try {
            const customers = await User.find({}).select('-password_hash').sort({ created_at: -1 });

            const customersWithBalance = await Promise.all(
                customers.map(async (customer) => {
                    const account = await Account.findOne({ user_id: customer._id });
                    return {
                        ...customer.toObject(),
                        available_balance: account?.available_balance || 0
                    };
                })
            );

            res.json(customersWithBalance);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch customers' });
        }
    }

    async getTransactions(req, res) {
        try {
            const transactions = await Transaction.find({}).sort({ created_at: -1 }).limit(100);
            res.json(transactions);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch transactions' });
        }
    }

    async getBalanceStats(req, res) {
        try {
            const adjustments = await BalanceAdjustment.find({});

            const totalCredits = adjustments
                .filter(a => a.adjustment_type === 'credit')
                .reduce((sum, a) => sum + a.adjustment_amount, 0);

            const totalDebits = adjustments
                .filter(a => a.adjustment_type === 'debit')
                .reduce((sum, a) => sum + a.adjustment_amount, 0);

            res.json({
                total_credits: totalCredits,
                total_debits: totalDebits,
                total_adjustments: adjustments.length
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch balance stats' });
        }
    }

    async getDashboardStats(req, res) {
        try {
            const totalCustomers = await User.countDocuments({});
            const totalTransactions = await Transaction.countDocuments({});
            const pendingKyc = await User.countDocuments({ kyc_status: 'pending' });

            const transactions = await Transaction.find({});
            const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);

            res.json({
                total_customers: totalCustomers,
                total_transactions: totalTransactions,
                total_volume: totalVolume,
                pending_kyc: pendingKyc
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch dashboard stats' });
        }
    }

    async getPendingTransactions(req, res) {
        try {
            const pending = await Transaction.find({ status: 'pending' }).sort({ created_at: -1 });
            res.json(pending);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch pending transactions' });
        }
    }

    async approveTransaction(req, res) {
        try {
            const { reference } = req.body;
            const transaction = await Transaction.findOne({ reference });

            if (!transaction) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            if (transaction.status !== 'pending') {
                return res.status(400).json({ error: 'Transaction is not pending' });
            }

            // Get accounts
            const senderAcc = await Account.findOne({ account_number: transaction.sender_account });
            const receiverAcc = await Account.findOne({ account_number: transaction.receiver_account });

            if (!senderAcc || !receiverAcc) {
                return res.status(404).json({ error: 'Account not found' });
            }

            // Perform transfer
            senderAcc.available_balance -= transaction.amount;
            senderAcc.ledger_balance -= transaction.amount;
            receiverAcc.available_balance += transaction.amount;
            receiverAcc.ledger_balance += transaction.amount;

            await senderAcc.save();
            await receiverAcc.save();

            // Update transaction status
            transaction.status = 'completed';
            await transaction.save();

            res.json({
                message: 'Transaction approved and completed',
                reference,
                status: 'completed'
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Transaction approval failed' });
        }
    }

    async declineTransaction(req, res) {
        try {
            const { reference, reason } = req.body;
            const transaction = await Transaction.findOne({ reference });

            if (!transaction) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            if (transaction.status !== 'pending') {
                return res.status(400).json({ error: 'Transaction is not pending' });
            }

            // Update transaction status
            transaction.status = 'declined';
            await transaction.save();

            res.json({
                message: 'Transaction declined',
                reference,
                status: 'declined'
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Transaction decline failed' });
        }
    }
}

module.exports = AdminController;
