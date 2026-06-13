const { Account, BalanceAdjustment, User, Admin } = require('../database/mongodb');

class BalanceController {
    async creditAccount(req, res) {
        try {
            const { account_number, amount, reason } = req.body;
            const adminId = req.user.id;

            // Find account
            const account = await Account.findOne({ account_number });
            if (!account) {
                return res.status(404).json({ error: 'Account not found' });
            }

            const previousBalance = account.available_balance;
            const newBalance = previousBalance + amount;

            // Update account balance
            account.available_balance = newBalance;
            account.ledger_balance = newBalance;
            await account.save();

            // Find user
            const user = await User.findById(account.user_id);

            // Log adjustment
            await BalanceAdjustment.create({
                admin_id: adminId,
                user_id: account.user_id,
                account_number,
                adjustment_type: 'credit',
                previous_balance: previousBalance,
                adjustment_amount: amount,
                new_balance: newBalance,
                reason
            });

            res.json({
                message: 'Account credited successfully',
                account: {
                    account_number,
                    previous_balance: previousBalance,
                    adjustment_amount: amount,
                    new_balance: newBalance
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Credit operation failed' });
        }
    }

    async debitAccount(req, res) {
        try {
            const { account_number, amount, reason } = req.body;
            const adminId = req.user.id;

            // Find account
            const account = await Account.findOne({ account_number });
            if (!account) {
                return res.status(404).json({ error: 'Account not found' });
            }

            const previousBalance = account.available_balance;
            if (previousBalance < amount) {
                return res.status(400).json({ error: 'Insufficient balance' });
            }

            const newBalance = previousBalance - amount;

            // Update account balance
            account.available_balance = newBalance;
            account.ledger_balance = newBalance;
            await account.save();

            // Log adjustment
            await BalanceAdjustment.create({
                admin_id: adminId,
                user_id: account.user_id,
                account_number,
                adjustment_type: 'debit',
                previous_balance: previousBalance,
                adjustment_amount: amount,
                new_balance: newBalance,
                reason
            });

            res.json({
                message: 'Account debited successfully',
                account: {
                    account_number,
                    previous_balance: previousBalance,
                    adjustment_amount: amount,
                    new_balance: newBalance
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Debit operation failed' });
        }
    }

    async setExactBalance(req, res) {
        try {
            const { account_number, new_balance, reason } = req.body;
            const adminId = req.user.id;

            // Find account
            const account = await Account.findOne({ account_number });
            if (!account) {
                return res.status(404).json({ error: 'Account not found' });
            }

            const previousBalance = account.available_balance;
            const adjustmentAmount = new_balance - previousBalance;

            // Update account balance
            account.available_balance = new_balance;
            account.ledger_balance = new_balance;
            await account.save();

            // Log adjustment
            await BalanceAdjustment.create({
                admin_id: adminId,
                user_id: account.user_id,
                account_number,
                adjustment_type: 'set_balance',
                previous_balance: previousBalance,
                adjustment_amount: adjustmentAmount,
                new_balance: new_balance,
                reason
            });

            res.json({
                message: 'Balance set successfully',
                account: {
                    account_number,
                    previous_balance: previousBalance,
                    new_balance: new_balance
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Set balance operation failed' });
        }
    }
}

module.exports = BalanceController;
