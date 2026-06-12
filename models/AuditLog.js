class AuditLogModel {
    constructor(db) {
        this.db = db;
    }
    
    async log(action, userId = null, adminId = null, ipAddress = null, userAgent = null, details = null) {
        await this.db.run(
            'INSERT INTO audit_logs (user_id, admin_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, adminId, action, ipAddress, userAgent, details]
        );
    }
    
    async getLogs(limit = 100, offset = 0) {
        return await this.db.all(
            `SELECT al.*, u.email as user_email, a.username as admin_username
             FROM audit_logs al
             LEFT JOIN users u ON al.user_id = u.id
             LEFT JOIN admins a ON al.admin_id = a.id
             ORDER BY al.timestamp DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
    }
    
    async getUserActivity(userId, days = 7) {
        return await this.db.all(
            'SELECT * FROM audit_logs WHERE user_id = ? AND timestamp >= datetime("now", ?) ORDER BY timestamp DESC',
            [userId, `-${days} days`]
        );
    }
}

module.exports = AuditLogModel;