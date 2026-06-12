const { initDatabase } = require('./init');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
    const db = await initDatabase();
    
    try {
        // Delete existing admins to allow credential updates
        await db.run('DELETE FROM admins');
        
        // Create admin with current credentials from environment
        const adminEmail = process.env.ADMIN_EMAIL || 'aureliusadmin@gmail.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin12345';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        await db.run(
            'INSERT INTO admins (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            ['superadmin', adminEmail, hashedPassword, 'superadmin']
        );
        console.log(`✅ Admin user created: ${adminEmail}`);
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
    }

    // Create sample users
    const sampleUsers = [
        {
            first_name: 'John',
            last_name: 'Smith',
            email: 'john.smith@example.com',
            phone: '+1234567890',
            account_type: 'premium',
            account_status: 'active',
            kyc_status: 'verified'
        },
        {
            first_name: 'Sarah',
            last_name: 'Johnson',
            email: 'sarah.johnson@example.com',
            phone: '+1234567891',
            account_type: 'business',
            account_status: 'active',
            kyc_status: 'verified'
        }
    ];

    for (const user of sampleUsers) {
        const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [user.email]);
        if (!existingUser) {
            const accountNumber = 'ACC' + Math.floor(Math.random() * 1000000000);
            const hashedPassword = await bcrypt.hash('Password@123', 10);
            
            const result = await db.run(
                `INSERT INTO users (account_number, first_name, last_name, email, phone, password_hash, account_type, account_status, kyc_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [accountNumber, user.first_name, user.last_name, user.email, user.phone, hashedPassword, user.account_type, user.account_status, user.kyc_status]
            );
            
            // Create account
            const userAccountNumber = 'AUB' + Math.floor(Math.random() * 1000000000);
            await db.run(
                'INSERT INTO accounts (user_id, account_number, available_balance, ledger_balance, currency) VALUES (?, ?, ?, ?, ?)',
                [result.lastID, userAccountNumber, 5000.00, 5000.00, 'USD']
            );
            
            console.log(`✅ Sample user created: ${user.email}`);
        }
    }
    
    console.log('✅ Database seeded successfully');
    await db.close();
}

if (require.main === module) {
    seedDatabase().catch(console.error);
}

module.exports = { seedDatabase };