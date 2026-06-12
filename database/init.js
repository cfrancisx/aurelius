const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

async function initDatabase() {
    const db = await open({
        filename: path.join(__dirname, 'aurelius.db'),
        driver: sqlite3.Database
    });

    // Users table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_number TEXT UNIQUE NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            address TEXT,
            date_of_birth TEXT,
            account_type TEXT DEFAULT 'personal',
            account_status TEXT DEFAULT 'pending',
            kyc_status TEXT DEFAULT 'pending',
            two_factor_secret TEXT,
            two_factor_enabled INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Accounts table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            account_number TEXT UNIQUE NOT NULL,
            currency TEXT DEFAULT 'USD',
            available_balance DECIMAL(15,2) DEFAULT 0,
            ledger_balance DECIMAL(15,2) DEFAULT 0,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Transactions table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_account TEXT NOT NULL,
            receiver_account TEXT NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            transaction_type TEXT NOT NULL,
            reference TEXT UNIQUE NOT NULL,
            narration TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Balance adjustments table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS balance_adjustments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            account_number TEXT NOT NULL,
            adjustment_type TEXT NOT NULL,
            previous_balance DECIMAL(15,2) NOT NULL,
            adjustment_amount DECIMAL(15,2) NOT NULL,
            new_balance DECIMAL(15,2) NOT NULL,
            reason TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_id) REFERENCES admins(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Beneficiaries table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS beneficiaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            beneficiary_name TEXT NOT NULL,
            bank_name TEXT NOT NULL,
            account_number TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Cards table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            card_number TEXT UNIQUE NOT NULL,
            expiry_date TEXT NOT NULL,
            cvv TEXT NOT NULL,
            card_type TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Loans table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS loans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            interest_rate DECIMAL(5,2) NOT NULL,
            repayment_period INTEGER NOT NULL,
            monthly_payment DECIMAL(15,2),
            status TEXT DEFAULT 'pending',
            approved_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Notifications table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'unread',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Support tickets table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS support_tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'open',
            admin_response TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Admins table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Audit logs table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            admin_id INTEGER,
            action TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            details TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Savings goals table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS savings_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            goal_name TEXT NOT NULL,
            target_amount DECIMAL(15,2) NOT NULL,
            current_amount DECIMAL(15,2) DEFAULT 0,
            deadline DATE,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Bill payments table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS bill_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            biller_name TEXT NOT NULL,
            account_number TEXT NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            reference TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'pending',
            payment_date DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Create indexes for better performance
    await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_account_number ON users(account_number);
        CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_accounts_account_number ON accounts(account_number);
        CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_account);
        CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_account);
        CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    `);

    // System settings table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS system_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            maintenance_mode INTEGER DEFAULT 0,
            transfer_limit DECIMAL(15,2) DEFAULT 10000,
            savings_interest_rate DECIMAL(5,2) DEFAULT 2.5,
            loan_interest_rate DECIMAL(5,2) DEFAULT 8.5,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Insert default settings if not exists
    await db.run(`
        INSERT OR IGNORE INTO system_settings (id, maintenance_mode, transfer_limit, savings_interest_rate, loan_interest_rate)
        VALUES (1, 0, 10000, 2.5, 8.5)
    `);

    console.log('✅ Database initialized successfully');
    return db;
}

// Only run initialization directly if this file is executed directly
if (require.main === module) {
    (async () => {
        try {
            await initDatabase();
            process.exit(0);
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = { initDatabase };