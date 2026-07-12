const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class UserModel {
    constructor(db) {
        this.db = db;
    }
    
    async create(userData) {
        const accountNumber = 'AUB' + Math.floor(Math.random() * 1000000000);
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const result = await this.db.run(
            `INSERT INTO users (account_number, first_name, last_name, email, phone, password_hash, address, date_of_birth, account_type, account_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [accountNumber, userData.first_name, userData.last_name, userData.email, userData.phone, hashedPassword, userData.address, userData.date_of_birth, userData.account_type || 'personal', 'active']
        );
        
        // Create default account with initial balance for new users
        const userAccountNumber = 'ACC' + Math.floor(Math.random() * 1000000000);
        await this.db.run(
            'INSERT INTO accounts (user_id, account_number, available_balance, ledger_balance) VALUES (?, ?, ?, ?)',
            [result.lastID, userAccountNumber, 0, 0]
        );
        
        return { id: result.lastID, account_number: accountNumber, email: userData.email, first_name: userData.first_name, last_name: userData.last_name };
    }
    
    async findByEmail(email) {
        return await this.db.get('SELECT * FROM users WHERE email = ?', [email]);
    }
    
    async findById(id) {
        return await this.db.get('SELECT id, account_number, first_name, last_name, email, phone, address, date_of_birth, account_type, account_status, kyc_status, created_at FROM users WHERE id = ?', [id]);
    }
    
    async updateKYC(userId, status) {
        await this.db.run('UPDATE users SET kyc_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, userId]);
    }
    
   async updateStatus(userId, status) {
    const validStatuses = [
        'active',
        'suspended',
        'frozen',
        'closed'
    ];

    if (!validStatuses.includes(status)) {
        throw new Error('Invalid account status');
    }

    await this.db.run(
        'UPDATE users SET account_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, userId]
    );
}
    
    async getAll(limit = 100, offset = 0) {
        return await this.db.all(
            `SELECT u.*, a.available_balance, a.ledger_balance, a.account_number 
             FROM users u 
             LEFT JOIN accounts a ON u.id = a.user_id 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
    }
}

module.exports = UserModel;