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
}

module.exports = AdminController;
