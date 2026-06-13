// Admin Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/admin/login';
        return;
    }
    
    await loadAdminData();
    setupAdminEventListeners();
});

async function loadAdminData() {
    try {
        const stats = await api.getAdminStats();
        updateStats(stats);
        
        const customers = await api.getCustomers();
        updateCustomersTable(customers);
        
        const balanceStats = await api.getBalanceStats();
        updateBalanceStats(balanceStats);
        
        const auditLogs = await api.getAuditLogs();
        updateAuditLogs(auditLogs);
    } catch (error) {
        console.error('Failed to load admin data:', error);
        showToast('Failed to load admin data', 'error');
    }
}

function updateStats(stats) {
    document.getElementById('totalCustomers').textContent = stats.total_customers;
    document.getElementById('totalTransactions').textContent = stats.total_transactions;
    document.getElementById('totalVolume').textContent = `£${formatNumber(stats.total_volume)}`;
    document.getElementById('pendingKYC').textContent = stats.pending_kyc;
}

function updateCustomersTable(customers) {
    const tbody = document.querySelector('#customersTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = customers.map(customer => `
        <tr>
            <td>${customer.account_number}</td>
            <td>${customer.first_name} ${customer.last_name}</td>
            <td>${customer.email}</td>
            <td>£${formatNumber(customer.available_balance || 0)}</td>
            <td><span class="badge badge-${customer.kyc_status}">${customer.kyc_status}</span></td>
            <td>
                <button onclick="viewCustomer(${customer.id})" class="btn-sm">View</button>
                <button onclick="manageBalance(${customer.id})" class="btn-sm">Balance</button>
            </td>
        </tr>
    `).join('');
}

function updateBalanceStats(stats) {
    if (!stats.stats) return;
    
    document.getElementById('totalAdjustments').textContent = stats.stats.total || 0;
    document.getElementById('totalCredits').textContent = stats.stats.credits || 0;
    document.getElementById('totalDebits').textContent = stats.stats.debits || 0;
    document.getElementById('creditAmount').textContent = `£${formatNumber(stats.stats.credit_amount || 0)}`;
    document.getElementById('debitAmount').textContent = `£${formatNumber(stats.stats.debit_amount || 0)}`;
    
    const recentContainer = document.getElementById('recentAdjustments');
    if (recentContainer && stats.recent) {
        recentContainer.innerHTML = stats.recent.map(adjustment => `
            <div class="adjustment-item">
                <div class="adjustment-info">
                    <strong>${adjustment.first_name} ${adjustment.last_name}</strong>
                    <small>${adjustment.account_number}</small>
                </div>
                <div class="adjustment-details">
                    <span class="adjustment-type ${adjustment.adjustment_type}">${adjustment.adjustment_type}</span>
                    <span class="adjustment-amount">£${formatNumber(adjustment.adjustment_amount)}</span>
                    <small>${new Date(adjustment.created_at).toLocaleString()}</small>
                </div>
                <div class="adjustment-reason">${adjustment.reason}</div>
                <small>By: ${adjustment.admin_name}</small>
            </div>
        `).join('');
    }
}

function updateAuditLogs(logs) {
    const tbody = document.querySelector('#auditLogsTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = logs.slice(0, 50).map(log => `
        <tr>
            <td>${new Date(log.timestamp).toLocaleString()}</td>
            <td>${log.action}</td>
            <td>${log.user_email || 'System'}</td>
            <td>${log.admin_username || 'N/A'}</td>
            <td>${log.ip_address || 'N/A'}</td>
        </tr>
    `).join('');
}

function setupAdminEventListeners() {
    // Search customer
    const searchInput = document.getElementById('customerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleCustomerSearch, 300));
    }
    
    // Balance management modal
    const creditForm = document.getElementById('creditForm');
    if (creditForm) {
        creditForm.addEventListener('submit', handleCreditAccount);
    }
    
    const debitForm = document.getElementById('debitForm');
    if (debitForm) {
        debitForm.addEventListener('submit', handleDebitAccount);
    }
    
    const setBalanceForm = document.getElementById('setBalanceForm');
    if (setBalanceForm) {
        setBalanceForm.addEventListener('submit', handleSetBalance);
    }
}

async function handleCustomerSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const customers = await api.getCustomers();
    const filtered = customers.filter(c => 
        c.account_number.toLowerCase().includes(searchTerm) ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm)
    );
    updateCustomersTable(filtered);
}

async function handleCreditAccount(e) {
    e.preventDefault();
    const accountNumber = document.getElementById('creditAccount').value.trim();
    const amount = parseFloat(document.getElementById('creditAmount').value);
    const reason = document.getElementById('creditReason').value.trim();
    
    // Validation
    if (!accountNumber || !amount || !reason) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (amount <= 0) {
        showToast('Amount must be greater than 0', 'error');
        return;
    }
    
    try {
        const response = await api.creditAccount(accountNumber, amount, reason);
        showToast(`✅ ${response.message} - £${formatNumber(response.account.adjustment_amount)}`, 'success');
        closeModal('creditModal');
        document.getElementById('creditForm').reset();
        await loadBalanceData();
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
}

async function handleDebitAccount(e) {
    e.preventDefault();
    const accountNumber = document.getElementById('debitAccount').value.trim();
    const amount = parseFloat(document.getElementById('debitAmount').value);
    const reason = document.getElementById('debitReason').value.trim();
    
    // Validation
    if (!accountNumber || !amount || !reason) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (amount <= 0) {
        showToast('Amount must be greater than 0', 'error');
        return;
    }
    
    try {
        const response = await api.debitAccount(accountNumber, amount, reason);
        showToast(`✅ ${response.message} - £${formatNumber(response.account.adjustment_amount)}`, 'success');
        closeModal('debitModal');
        document.getElementById('debitForm').reset();
        await loadBalanceData();
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
}

async function handleSetBalance(e) {
    e.preventDefault();
    const accountNumber = document.getElementById('setBalanceAccount').value.trim();
    const newBalance = parseFloat(document.getElementById('newBalance').value);
    const reason = document.getElementById('setBalanceReason').value.trim();
    
    // Validation
    if (!accountNumber || newBalance === null || isNaN(newBalance) || !reason) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (newBalance < 0) {
        showToast('Balance cannot be negative', 'error');
        return;
    }
    
    try {
        const response = await api.setExactBalance(accountNumber, newBalance, reason);
        showToast(`✅ ${response.message} - New Balance: £${formatNumber(response.account.new_balance)}`, 'success');
        closeModal('setBalanceModal');
        document.getElementById('setBalanceForm').reset();
        await loadBalanceData();
    } catch (error) {
        showToast(`❌ ${error.message}`, 'error');
    }
}

function viewCustomer(customerId) {
    window.location.href = `/admin/customers/${customerId}`;
}

function manageBalance(customerId) {
    document.getElementById('balanceModal').style.display = 'block';
    document.getElementById('customerId').value = customerId;
}

async function loadBalanceData() {
    try {
        const balanceStats = await api.getBalanceStats();
        updateBalanceStats(balanceStats);
    } catch (error) {
        console.error('Failed to load balance data:', error);
    }
}

function formatNumber(num) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Balance Management Modal Functions
function showCreditModal() {
    const modal = document.getElementById('creditModal');
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('show');
        // Close modal when clicking outside
        window.onclick = function(event) {
            if (event.target === modal) {
                closeModal('creditModal');
            }
        };
    }
}

function showDebitModal() {
    const modal = document.getElementById('debitModal');
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('show');
        // Close modal when clicking outside
        window.onclick = function(event) {
            if (event.target === modal) {
                closeModal('debitModal');
            }
        };
    }
}

function showSetBalanceModal() {
    const modal = document.getElementById('setBalanceModal');
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('show');
        // Close modal when clicking outside
        window.onclick = function(event) {
            if (event.target === modal) {
                closeModal('setBalanceModal');
            }
        };
    }
}

// Close modal with animation
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// CSV Export Function
function exportCustomers() {
    const table = document.querySelector('#customersTable');
    if (!table) return;
    
    let csv = 'Account Number,Name,Email,Phone,Balance,Status,KYC Status\n';
    
    table.querySelectorAll('tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        const values = [];
        cells.forEach((cell, index) => {
            if (index < 7) { // Skip actions column
                values.push('"' + cell.textContent.trim() + '"');
            }
        });
        csv += values.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Logout Function
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
}

// Update Customer Status
async function updateCustomerStatus(customerId) {
    const newStatus = document.getElementById('newStatus').value;
    const reason = document.getElementById('statusReason').value;
    
    try {
        const response = await fetch(`/api/admin/customers/${customerId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status: newStatus, reason })
        });
        
        if (response.ok) {
            showToast('Status updated successfully', 'success');
            closeModal('statusModal');
            location.reload();
        } else {
            showToast('Failed to update status', 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Update KYC Status
async function updateKYCStatus(customerId, status) {
    try {
        const response = await fetch(`/api/admin/customers/${customerId}/kyc`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showToast('KYC status updated successfully', 'success');
            location.reload();
        } else {
            showToast('Failed to update KYC status', 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}