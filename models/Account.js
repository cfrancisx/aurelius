class AccountModel {
    constructor(db) {
        this.db = db;
    }
    
    async getUserAccounts(userId) {
        return await this.db.all('SELECT * FROM accounts WHERE user_id = ?', [userId]);
    }
    
    async getAccountByNumber(accountNumber) {
        return await this.db.get('SELECT * FROM accounts WHERE account_number = ?', [accountNumber]);
    }

    async getUserIdFromAccount(accountNumber) {
        const account = await this.db.get('SELECT user_id FROM accounts WHERE account_number = ?', [accountNumber]);
        return account ? account.user_id : null;
    }
    
    async updateBalance(accountNumber, amount, type) {
        if (type === 'credit') {
            await this.db.run(
                'UPDATE accounts SET available_balance = available_balance + ?, ledger_balance = ledger_balance + ? WHERE account_number = ?',
                [amount, amount, accountNumber]
            );
        } else {
            await this.db.run(
                'UPDATE accounts SET available_balance = available_balance - ? WHERE account_number = ?',
                [amount, accountNumber]
            );
        }
    }
    
    async getBalance(accountNumber) {
        const account = await this.db.get('SELECT available_balance, ledger_balance FROM accounts WHERE account_number = ?', [accountNumber]);
        return account;
    }
}

module.exports = AccountModel;