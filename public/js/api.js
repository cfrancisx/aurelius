class API {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = { ...options.headers };

        // Only add Content-Type for requests with a body
        const method = (options.method || 'GET').toUpperCase();
        if (['POST', 'PUT', 'PATCH'].includes(method) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        // Always read fresh token from localStorage
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Request failed');
        }

        return response.json();
    }

    // Auth endpoints
    async register(userData) {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return response.json();
    }

    async login(email, password) {
        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }
            
            const data = await response.json();
            if (data.token) {
                this.setToken(data.token);
            }
            return data;
        } catch (error) {
            throw new Error(error.message || 'Failed to connect to server');
        }
    }

    // User endpoints
    async getProfile() {
        return this.request('/user/profile');
    }

    async getAccounts() {
        return this.request('/user/accounts');
    }

    async getTransactions(accountNumber) {
        return this.request(`/user/transactions/${accountNumber}`);
    }

    async transfer(data) {
        return this.request('/transfer', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getBeneficiaries() {
        return this.request('/user/beneficiaries');
    }

    async addBeneficiary(data) {
        return this.request('/user/beneficiaries', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Admin endpoints
    async adminLogin(email, password) {
        const response = await fetch('/auth/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (data.token) {
            this.setToken(data.token);
        }
        return data;
    }

    async getCustomers() {
        return this.request('/admin/customers');
    }

    async creditAccount(accountNumber, amount, reason) {
        return this.request('/admin/balance/credit', {
            method: 'POST',
            body: JSON.stringify({ account_number: accountNumber, amount, reason })
        });
    }

    async debitAccount(accountNumber, amount, reason) {
        return this.request('/admin/balance/debit', {
            method: 'POST',
            body: JSON.stringify({ account_number: accountNumber, amount, reason })
        });
    }

    async setExactBalance(accountNumber, newBalance, reason) {
        return this.request('/admin/balance/set-exact', {
            method: 'POST',
            body: JSON.stringify({ account_number: accountNumber, new_balance: newBalance, reason })
        });
    }

    async getBalanceStats() {
        return this.request('/admin/balance/stats');
    }

    async uploadKYC() {
        return this.request('/kyc/upload', {
            method: 'POST',
            body: JSON.stringify({ document: 'uploaded' })
        });
    }

    async getPendingTransactions() {
        return this.request('/admin/transactions/pending');
    }

    async approveTransaction(reference) {
        return this.request('/admin/transactions/approve', {
            method: 'POST',
            body: JSON.stringify({ reference })
        });
    }

    async declineTransaction(reference, reason) {
        return this.request('/admin/transactions/decline', {
            method: 'POST',
            body: JSON.stringify({ reference, reason })
        });
    }

    async getAuditLogs() {
        return this.request('/admin/audit-logs');
    }

    async getAdminStats() {
        return this.request('/admin/dashboard/stats');
    }
}

const api = new API();