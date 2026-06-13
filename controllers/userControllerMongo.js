const { Account, Transaction, User } = require('../database/mongodb');

class UserController {
    async getAccounts(req, res) {
        try {
            const userId = req.user.id;
            const accounts = await Account.find({ user_id: userId });

            res.json(accounts);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch accounts' });
        }
    }

    async transfer(req, res) {
        try {
            const { sender_account, receiver_account, amount, narration } = req.body;

            // Validate accounts exist
            const senderAcc = await Account.findOne({ account_number: sender_account });
            const receiverAcc = await Account.findOne({ account_number: receiver_account });

            if (!senderAcc || !receiverAcc) {
                return res.status(404).json({ error: 'Account not found' });
            }

            if (senderAcc.available_balance < amount) {
                return res.status(400).json({ error: 'Insufficient balance' });
            }

            // Perform transfer
            senderAcc.available_balance -= amount;
            senderAcc.ledger_balance -= amount;
            receiverAcc.available_balance += amount;
            receiverAcc.ledger_balance += amount;

            await senderAcc.save();
            await receiverAcc.save();

            // Log transaction
            const reference = `TXN-${Date.now()}`;
            await Transaction.create({
                sender_account,
                receiver_account,
                amount,
                transaction_type: 'transfer',
                reference,
                narration,
                status: 'completed'
            });

            res.json({
                message: 'Transfer successful',
                reference,
                transaction: {
                    sender_account,
                    receiver_account,
                    amount,
                    status: 'completed'
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Transfer failed' });
        }
    }

    async getTransactions(req, res) {
        try {
            const accountNumber = req.query.account_number;
            let query = {};

            if (accountNumber) {
                query = {
                    $or: [
                        { sender_account: accountNumber },
                        { receiver_account: accountNumber }
                    ]
                };
            }

            const transactions = await Transaction.find(query).sort({ created_at: -1 }).limit(50);
            res.json(transactions);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch transactions' });
        }
    }

    async getBalance(req, res) {
        try {
            const accountNumber = req.query.account_number;
            const account = await Account.findOne({ account_number: accountNumber });

            if (!account) {
                return res.status(404).json({ error: 'Account not found' });
            }

            res.json({
                account_number: accountNumber,
                available_balance: account.available_balance,
                ledger_balance: account.ledger_balance,
                currency: account.currency
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch balance' });
        }
    }
}

module.exports = UserController;
