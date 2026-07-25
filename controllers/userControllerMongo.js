const bcrypt = require('bcryptjs');
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
            const userId = req.user.id;
            const { sender_account, receiver_account, routing_number, narration, pin } = req.body;
            const amount = parseFloat(req.body.amount);

            if (!sender_account || !receiver_account) {
                return res.status(400).json({ error: 'Sender and receiver account are required' });
            }

            if (isNaN(amount) || amount <= 0) {
                return res.status(400).json({ error: 'Enter a valid amount greater than 0' });
            }

            if (sender_account === receiver_account) {
                return res.status(400).json({ error: 'Cannot transfer to the same account' });
            }

            // The sender account must exist and belong to this user. The receiver
            // can be any account number (external/other bank) — the admin reviews
            // and approves or declines the transfer.
            const senderAcc = await Account.findOne({ account_number: sender_account });

            if (!senderAcc) {
                return res.status(404).json({ error: 'Account not found' });
            }

            // The sender account must belong to the logged-in user.
            if (senderAcc.user_id.toString() !== userId) {
                return res.status(403).json({ error: 'You can only transfer from your own account' });
            }

            // Enforce KYC verification server-side (the UI also gates this).
            const sender = await User.findById(userId).select('kyc_status transaction_pin');
            if (!sender || sender.kyc_status !== 'verified') {
                return res.status(403).json({ error: 'Complete KYC verification before making transfers' });
            }

            // Require the user's transaction PIN to authorize the transfer.
            if (!sender.transaction_pin) {
                return res.status(400).json({ error: 'Set your transaction PIN in Settings before making transfers' });
            }
            if (!pin) {
                return res.status(400).json({ error: 'Transaction PIN is required' });
            }
            const pinValid = await bcrypt.compare(String(pin), sender.transaction_pin);
            if (!pinValid) {
                return res.status(401).json({ error: 'Incorrect transaction PIN' });
            }

            if (senderAcc.available_balance < amount) {
                return res.status(400).json({ error: 'Insufficient balance' });
            }

            // Create pending transaction (needs admin approval)
            const reference = `TXN-${Date.now()}`;
            const transaction = await Transaction.create({
                sender_account,
                receiver_account,
                routing_number,
                amount,
                transaction_type: 'transfer',
                reference,
                narration,
                status: 'pending' // Pending admin approval
            });

            res.json({
                message: 'Transfer submitted for approval',
                reference,
                transaction: {
                    sender_account,
                    receiver_account,
                    routing_number,
                    amount,
                    status: 'pending',
                    reference
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Transfer failed' });
        }
    }

    async uploadKYCDocument(req, res) {
        try {
            const userId = req.user.id;
            
            // Check if files are provided
            const id_document = req.files?.id_document?.[0];
            const selfie_photo = req.files?.selfie_photo?.[0];

            // Both documents are required. There is no auto-verify path — an admin
            // reviews the uploaded documents and approves/rejects the customer.
            if (!id_document || !selfie_photo) {
                return res.status(400).json({
                    error: 'Both ID document and selfie photo are required'
                });
            }

            // Persist the actual file bytes (base64) so an admin can review them.
            const kyc_documents = {
                id_document_name: id_document?.originalname || null,
                id_document_mime: id_document?.mimetype || null,
                id_document_data: id_document ? id_document.buffer.toString('base64') : null,
                selfie_photo_name: selfie_photo?.originalname || null,
                selfie_photo_mime: selfie_photo?.mimetype || null,
                selfie_photo_data: selfie_photo ? selfie_photo.buffer.toString('base64') : null,
                uploaded_at: new Date()
            };

            // Mark as pending review — an admin approves/rejects after viewing the documents.
            const user = await User.findByIdAndUpdate(
                userId,
                {
                    kyc_status: 'pending',
                    kyc_documents
                },
                { new: true }
            );

            res.json({
                message: 'KYC documents uploaded successfully and submitted for review',
                kyc_status: user.kyc_status,
                uploaded_at: kyc_documents.uploaded_at
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'KYC upload failed' });
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

    async getStatement(req, res) {
    try {
        const userId = req.user.id;
        const { account_number, from_date, to_date } = req.query;

        if (!account_number || !from_date || !to_date) {
            return res.status(400).json({ error: 'account_number, from_date, and to_date are required' });
        }

        // Confirm this account actually belongs to the logged-in user —
        // never trust the account_number query param on its own.
        const account = await Account.findOne({ account_number, user_id: userId });
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Include the full end day (23:59:59) so transactions on the "to" date are included.
        const startDate = new Date(from_date);
        const endDate = new Date(to_date);
        endDate.setHours(23, 59, 59, 999);

        const transactions = await Transaction.find({
            $or: [
                { sender_account: account_number },
                { receiver_account: account_number }
            ],
            created_at: { $gte: startDate, $lte: endDate }
        }).sort({ created_at: 1 }); // oldest first, so running balance math reads naturally

        res.json({
            account: {
                account_number: account.account_number,
                ledger_balance: account.ledger_balance,
                available_balance: account.available_balance,
                currency: account.currency
            },
            period: {
                from_date,
                to_date
            },
            transactions
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate statement' });
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

    async getUserProfile(req, res) {
        try {
            const userId = req.user.id;
            const user = await User.findById(userId).select('-password_hash');

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();

            res.json({
                id: user._id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                full_name: fullName || user.email,
                account_number: user.account_number,
                kyc_status: user.kyc_status || 'pending',
                account_status: user.account_status || 'active',
                registration_status: user.registration_status || 'completed',
                has_transaction_pin: !!user.transaction_pin
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch user profile' });
        }
    }

    async setTransactionPin(req, res) {
        try {
            const userId = req.user.id;
            const { current_pin, pin } = req.body;

            // PIN must be exactly 4 digits.
            if (!/^\d{4}$/.test(String(pin || ''))) {
                return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
            }

            const user = await User.findById(userId).select('transaction_pin');
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // If a PIN already exists, the current one must be supplied and correct.
            if (user.transaction_pin) {
                if (!current_pin) {
                    return res.status(400).json({ error: 'Enter your current PIN to change it' });
                }
                const ok = await bcrypt.compare(String(current_pin), user.transaction_pin);
                if (!ok) {
                    return res.status(401).json({ error: 'Current PIN is incorrect' });
                }
            }

            user.transaction_pin = await bcrypt.hash(String(pin), 10);
            await user.save();

            res.json({ message: 'Transaction PIN saved successfully', has_transaction_pin: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to save transaction PIN' });
        }
    }
}

module.exports = UserController;
