const { v4: uuidv4 } = require('uuid');

class TransactionModel {
    constructor(db) {
        this.db = db;
    }
    
    async create(transactionData) {
        const reference = uuidv4();
        const result = await this.db.run(
            `INSERT INTO transactions (sender_account, receiver_account, amount, transaction_type, reference, narration, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [transactionData.sender_account, transactionData.receiver_account, transactionData.amount, transactionData.transaction_type, reference, transactionData.narration, 'completed']
        );
        
        return { id: result.lastID, reference };
    }
    
    async getUserTransactions(accountNumber, limit = 50) {
        return await this.db.all(
            `SELECT * FROM transactions 
             WHERE sender_account = ? OR receiver_account = ? 
             ORDER BY created_at DESC 
             LIMIT ?`,
            [accountNumber, accountNumber, limit]
        );
    }
    
    async getTransactionByReference(reference) {
        return await this.db.get('SELECT * FROM transactions WHERE reference = ?', [reference]);
    }
    
    async getDailyStats() {
        const today = new Date().toISOString().split('T')[0];
        return await this.db.get(
            `SELECT 
                COUNT(*) as total_count,
                SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END) as total_credits,
                SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END) as total_debits
             FROM transactions 
             WHERE DATE(created_at) = ?`,
            [today]
        );
    }
}

module.exports = TransactionModel;