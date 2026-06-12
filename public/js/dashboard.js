// Dashboard initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Load dashboard data
    await loadDashboardData();
    setupEventListeners();
    initializeCharts();
});

async function loadDashboardData() {
    try {
        const profile = await api.getProfile();
        const accounts = await api.getAccounts();
        const transactions = await api.getTransactions(accounts[0]?.account_number);
        
        updateUserInfo(profile);
        updateAccounts(accounts);
        updateTransactions(transactions);
        updateBalanceChart(accounts);
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

function updateUserInfo(user) {
    document.getElementById('userName').textContent = `${user.first_name} ${user.last_name}`;
    document.getElementById('userEmail').textContent = user.email;
}

function updateAccounts(accounts) {
    const container = document.getElementById('accountsContainer');
    if (!container) return;
    
    container.innerHTML = accounts.map(account => `
        <div class="account-card">
            <div class="account-type">${account.currency} Account</div>
            <div class="account-number">${account.account_number}</div>
            <div class="balance">$${formatNumber(account.available_balance)}</div>
            <div class="balance-label">Available Balance</div>
        </div>
    `).join('');
}

function updateTransactions(transactions) {
    const container = document.getElementById('transactionsTable');
    if (!container) return;
    
    const tbody = container.querySelector('tbody');
    if (tbody) {
        tbody.innerHTML = transactions.slice(0, 10).map(transaction => `
            <tr>
                <td>${new Date(transaction.created_at).toLocaleDateString()}</td>
                <td>${transaction.narration || 'Transfer'}</td>
                <td>${transaction.sender_account === 'SYSTEM' ? 'Credit' : transaction.receiver_account === 'SYSTEM' ? 'Debit' : 'Transfer'}</td>
                <td class="${transaction.transaction_type === 'credit' ? 'text-success' : 'text-danger'}">
                    ${transaction.transaction_type === 'credit' ? '+' : '-'}$${formatNumber(transaction.amount)}
                </td>
                <td>${transaction.status}</td>
            </tr>
        `).join('');
    }
}

function updateBalanceChart(accounts) {
    const ctx = document.getElementById('balanceChart')?.getContext('2d');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Account Balance',
                data: accounts.map(a => a.available_balance),
                borderColor: '#c6a43f',
                backgroundColor: 'rgba(198, 164, 63, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function setupEventListeners() {
    // Transfer form
    const transferForm = document.getElementById('transferForm');
    if (transferForm) {
        transferForm.addEventListener('submit', handleTransfer);
    }
    
    // Quick actions
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            handleQuickAction(action);
        });
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

async function handleTransfer(e) {
    e.preventDefault();
    
    const formData = {
        receiver_account: document.getElementById('receiverAccount').value,
        amount: parseFloat(document.getElementById('amount').value),
        narration: document.getElementById('narration').value
    };
    
    try {
        await api.transfer(formData);
        showToast('Transfer completed successfully!', 'success');
        setTimeout(() => location.reload(), 2000);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function handleQuickAction(action) {
    switch(action) {
        case 'transfer':
            document.getElementById('transferModal').style.display = 'block';
            break;
        case 'pay-bills':
            window.location.href = '/dashboard/payments';
            break;
        case 'statements':
            window.location.href = '/dashboard/statements';
            break;
        case 'support':
            window.location.href = '/dashboard/support';
            break;
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
}

function formatNumber(num) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

function initializeCharts() {
    // Additional chart initialization if needed
}