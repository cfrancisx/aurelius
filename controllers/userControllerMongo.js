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

            // Create pending transaction (needs admin approval)
            const reference = `TXN-${Date.now()}`;
            const transaction = await Transaction.create({
                sender_account,
                receiver_account,
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

            if (!id_document && !selfie_photo) {
                // Accept request without files (for backward compatibility)
                // Just mark KYC as verified
                const user = await User.findByIdAndUpdate(
                    userId,
                    { kyc_status: 'verified' },
                    { new: true }
                );

                return res.json({
                    message: 'KYC verification completed',
                    kyc_status: user.kyc_status
                });
            }

            // If files are provided, validate both are present
            if ((id_document && !selfie_photo) || (!id_document && selfie_photo)) {
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
            const user = await User.findById(userId).select('-password');

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({
                id: user._id,
                email: user.email,
                full_name: user.full_name,
                kyc_status: user.kyc_status || 'pending',
                account_status: user.account_status || 'active',
                registration_status: user.registration_status || 'completed'
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch user profile' });
        }
    }
}

module.exports = UserController;
