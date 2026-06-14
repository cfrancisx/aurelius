const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB Connection
async function connectDatabase() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://aurelius_admin:Admin12345@cluster0.3mottii.mongodb.net/?appName=Cluster0';
    
    try {
        await mongoose.connect(mongoUri);
        console.log('✅ MongoDB connected successfully');
        return mongoose.connection;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

// User Schema
const userSchema = new mongoose.Schema({
    account_number: { type: String, unique: true, required: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phone: { type: String, required: true },
    password_hash: { type: String, required: true },
    address: String,
    date_of_birth: String,
    account_type: { type: String, default: 'personal' },
    account_status: { type: String, default: 'pending' },
    kyc_status: { type: String, default: 'pending' },
    kyc_documents: {
        id_document_name: String,
        id_document_mime: String,
        id_document_data: String,   // base64-encoded file bytes
        selfie_photo_name: String,
        selfie_photo_mime: String,
        selfie_photo_data: String,  // base64-encoded file bytes
        uploaded_at: Date
    },
    two_factor_secret: String,
    two_factor_enabled: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Admin Schema
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password_hash: { type: String, required: true },
    role: { type: String, default: 'admin' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Account Schema
const accountSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    account_number: { type: String, unique: true, required: true },
    currency: { type: String, default: 'GBP' },
    available_balance: { type: Number, default: 0 },
    ledger_balance: { type: Number, default: 0 },
    status: { type: String, default: 'active' },
    created_at: { type: Date, default: Date.now }
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
    sender_account: { type: String, required: true },
    receiver_account: { type: String, required: true },
    amount: { type: Number, required: true },
    transaction_type: { type: String, required: true },
    reference: { type: String, unique: true, required: true },
    narration: String,
    status: { type: String, default: 'pending' },
    created_at: { type: Date, default: Date.now }
});

// Balance Adjustment Schema
const balanceAdjustmentSchema = new mongoose.Schema({
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    account_number: { type: String, required: true },
    adjustment_type: { type: String, required: true },
    previous_balance: { type: Number, required: true },
    adjustment_amount: { type: Number, required: true },
    new_balance: { type: Number, required: true },
    reason: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: true },
    user_id: mongoose.Schema.Types.ObjectId,
    admin_id: mongoose.Schema.Types.ObjectId,
    ip_address: String,
    user_agent: String,
    created_at: { type: Date, default: Date.now }
});

// Card Schema
const cardSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    card_number: { type: String, unique: true, required: true },
    card_type: String,
    expiry_date: String,
    cvv: String,
    status: { type: String, default: 'active' },
    created_at: { type: Date, default: Date.now }
});

// Loan Schema
const loanSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: Number,
    interest_rate: Number,
    status: { type: String, default: 'pending' },
    created_at: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Account = mongoose.model('Account', accountSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const BalanceAdjustment = mongoose.model('BalanceAdjustment', balanceAdjustmentSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const Card = mongoose.model('Card', cardSchema);
const Loan = mongoose.model('Loan', loanSchema);

module.exports = {
    connectDatabase,
    User,
    Admin,
    Account,
    Transaction,
    BalanceAdjustment,
    AuditLog,
    Card,
    Loan
};
