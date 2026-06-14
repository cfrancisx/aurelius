const bcrypt = require('bcryptjs');
const { User, Admin, Account, Transaction } = require('./mongodb');

async function seedMongoDB() {
    try {
        // Clear existing data
        await Admin.deleteMany({});
        await User.deleteMany({});
        await Account.deleteMany({});
        await Transaction.deleteMany({});
        
        console.log('✅ Collections cleared');
        
        // Create admin
        const adminEmail = process.env.ADMIN_EMAIL || 'aureliusadmin@gmail.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin12345';
        const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
        
        const admin = await Admin.create({
            username: 'superadmin',
            email: adminEmail,
            password_hash: hashedAdminPassword,
            role: 'superadmin'
        });
        
        console.log(`✅ Admin user created: ${adminEmail}`);
        
        // Create sample users with accounts
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
            },
            {
                first_name: 'Michael',
                last_name: 'Brown',
                email: 'michael.brown@example.com',
                phone: '+1234567892',
                account_type: 'personal',
                account_status: 'active',
                kyc_status: 'pending'
            },
            {
                first_name: 'Emily',
                last_name: 'Davis',
                email: 'emily.davis@example.com',
                phone: '+1234567893',
                account_type: 'personal',
                account_status: 'active',
                kyc_status: 'pending'
            },
            {
                first_name: 'David',
                last_name: 'Wilson',
                email: 'david.wilson@example.com',
                phone: '+1234567894',
                account_type: 'premium',
                account_status: 'active',
                kyc_status: 'verified'
            },
            {
                first_name: 'Sophie',
                last_name: 'Taylor',
                email: 'sophie.taylor@example.com',
                phone: '+1234567895',
                account_type: 'personal',
                account_status: 'active',
                kyc_status: 'pending'
            },
            {
                first_name: 'James',
                last_name: 'Martinez',
                email: 'james.martinez@example.com',
                phone: '+1234567896',
                account_type: 'business',
                account_status: 'active',
                kyc_status: 'verified'
            },
            {
                first_name: 'Lisa',
                last_name: 'Anderson',
                email: 'lisa.anderson@example.com',
                phone: '+1234567897',
                account_type: 'personal',
                account_status: 'active',
                kyc_status: 'pending'
            },
            {
                first_name: 'Robert',
                last_name: 'Thomas',
                email: 'robert.thomas@example.com',
                phone: '+1234567898',
                account_type: 'premium',
                account_status: 'active',
                kyc_status: 'verified'
            }
        ];
        
        for (const userData of sampleUsers) {
            const existingUser = await User.findOne({ email: userData.email });
            
            if (!existingUser) {
                // Shared account number for both the User and its Account so the admin
                // balance tools can locate the account by the number shown in the UI.
                const accountNumber = 'AUB' + Math.floor(Math.random() * 1000000000);
                const hashedPassword = await bcrypt.hash('Password@123', 10);
                
                const user = await User.create({
                    account_number: accountNumber,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    email: userData.email,
                    phone: userData.phone,
                    password_hash: hashedPassword,
                    account_type: userData.account_type,
                    account_status: userData.account_status,
                    kyc_status: userData.kyc_status
                });
                
                // Create account for user
                await Account.create({
                    user_id: user._id,
                    account_number: accountNumber,
                    currency: 'GBP',
                    available_balance: 5000,
                    ledger_balance: 5000,
                    status: 'active'
                });
                
                console.log(`✅ Sample user created: ${userData.email}`);
            }
        }
        
        // Create sample transactions
        const users = await User.find({});
        if (users.length >= 2) {
            for (let i = 0; i < 7; i++) {
                const senderIdx = Math.floor(Math.random() * users.length);
                const receiverIdx = Math.floor(Math.random() * users.length);
                
                if (senderIdx !== receiverIdx) {
                    const sender = users[senderIdx];
                    const receiver = users[receiverIdx];
                    const senderAcc = await Account.findOne({ user_id: sender._id });
                    const receiverAcc = await Account.findOne({ user_id: receiver._id });
                    
                    if (senderAcc && receiverAcc) {
                        await Transaction.create({
                            sender_account: senderAcc.account_number,
                            receiver_account: receiverAcc.account_number,
                            amount: Math.floor(Math.random() * 5000) + 100,
                            transaction_type: 'transfer',
                            reference: `TXN-${Date.now()}-${i}`,
                            narration: 'Sample transaction',
                            status: 'completed'
                        });
                    }
                }
            }
        }
        
        console.log('✅ MongoDB seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding MongoDB:', error.message);
    }
}

module.exports = { seedMongoDB };
