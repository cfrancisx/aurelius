const { User, Account, Transaction, BalanceAdjustment, Admin, AuditLog } = require('../database/mongodb');

class AdminController {
    async getCustomers(req, res) {
        try {
            // Exclude the bulky base64 document data from the list; it is fetched
            // on demand via getKYCDocuments when an admin opens a customer.
            const customers = await User.find({})
                .select('-password_hash -kyc_documents.id_document_data -kyc_documents.selfie_photo_data')
                .sort({ created_at: -1 });

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

    async getKYCDocuments(req, res) {
        try {
            const user = await User.findById(req.params.id).select('first_name last_name email kyc_status kyc_documents');
            if (!user) {
                return res.status(404).json({ error: 'Customer not found' });
            }

            const docs = user.kyc_documents || {};
            const toDataUri = (mime, data) =>
                data ? `data:${mime || 'image/jpeg'};base64,${data}` : null;

            res.json({
                customer: {
                    name: `${user.first_name} ${user.last_name}`,
                    email: user.email,
                    kyc_status: user.kyc_status
                },
                id_document: {
                    name: docs.id_document_name || null,
                    mime: docs.id_document_mime || null,
                    data_uri: toDataUri(docs.id_document_mime, docs.id_document_data)
                },
                selfie_photo: {
                    name: docs.selfie_photo_name || null,
                    mime: docs.selfie_photo_mime || null,
                    data_uri: toDataUri(docs.selfie_photo_mime, docs.selfie_photo_data)
                },
                uploaded_at: docs.uploaded_at || null
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch KYC documents' });
        }
    }

    async updateKYCStatus(req, res) {
        try {
            const { status } = req.body;
            const allowed = ['pending', 'verified', 'rejected'];
            if (!allowed.includes(status)) {
                return res.status(400).json({ error: 'Invalid KYC status' });
            }

            const user = await User.findByIdAndUpdate(
                req.params.id,
                { kyc_status: status },
                { new: true }
            ).select('first_name last_name kyc_status');

            if (!user) {
                return res.status(404).json({ error: 'Customer not found' });
            }

            res.json({ message: 'KYC status updated', kyc_status: user.kyc_status });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update KYC status' });
        }
    }

    async updateCustomerStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;
            const allowed = ['active', 'suspended', 'frozen', 'closed'];

            if (!allowed.includes(status)) {
                return res.status(400).json({ error: 'Invalid account status' });
            }

            const user = await User.findByIdAndUpdate(
                id,
                { account_status: status, updated_at: new Date() },
                { new: true }
            ).select('first_name last_name account_status');

            if (!user) {
                return res.status(404).json({ error: 'Customer not found' });
            }

            await AuditLog.create({
                action: `account_status_changed_to_${status}`,
                user_id: id,
                admin_id: req.user?.id || null,
                ip_address: req.ip,
                user_agent: req.headers['user-agent']
            });

            res.json({
                success: true,
                message: `Account ${status} successfully`,
                account_status: user.account_status
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update account status' });
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

    async getAuditLogs(req, res) {
        try {
            const logs = await AuditLog.find({}).sort({ created_at: -1 }).limit(100);

            // Shape the records for the admin UI, which expects `timestamp`.
            const formatted = logs.map(log => ({
                action: log.action,
                timestamp: log.created_at,
                ip_address: log.ip_address || null,
                user_email: null,
                admin_username: null,
                details: log.user_agent || null
            }));

            res.json(formatted);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch audit logs' });
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

            // Get accounts. The sender must be an internal account; the receiver
            // may be external (any account number), in which case we only debit the
            // sender and the funds leave the bank.
            const senderAcc = await Account.findOne({ account_number: transaction.sender_account });
            const receiverAcc = await Account.findOne({ account_number: transaction.receiver_account });

            if (!senderAcc) {
                return res.status(404).json({ error: 'Sender account not found' });
            }

            // Re-check funds at approval time — the sender may have queued several
            // pending transfers, or had their balance adjusted since submitting.
            if (senderAcc.available_balance < transaction.amount) {
                return res.status(400).json({ error: 'Sender has insufficient balance to complete this transfer' });
            }

            // Perform transfer: always debit the sender; credit the receiver only
            // when it is an internal account.
            senderAcc.available_balance -= transaction.amount;
            senderAcc.ledger_balance -= transaction.amount;
            await senderAcc.save();

            if (receiverAcc) {
                receiverAcc.available_balance += transaction.amount;
                receiverAcc.ledger_balance += transaction.amount;
                await receiverAcc.save();
            }

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
