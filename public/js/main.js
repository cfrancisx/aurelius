// Main JavaScript for Aurelius Bank
// Global utilities and theme management

// Theme Management
class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.init();
    }
    
    init() {
        this.applyTheme(this.theme);
        this.setupThemeToggle();
    }
    
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.updateToggleButton(theme);
    }
    
    toggle() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.theme = newTheme;
        this.applyTheme(newTheme);
    }
    
    setupThemeToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
    }
    
    updateToggleButton(theme) {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.textContent = theme === 'light' ? '🌙' : '☀️';
        }
    }
}

// Currency Formatter
class CurrencyFormatter {
    static format(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }
    
    static formatCompact(amount) {
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            compactDisplay: 'short'
        }).format(amount);
    }
}

// Date Formatter
class DateFormatter {
    static format(date, format = 'short') {
        const d = new Date(date);
        const options = {
            short: { month: 'short', day: 'numeric', year: 'numeric' },
            long: { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' },
            time: { hour: '2-digit', minute: '2-digit' }
        };
        
        return d.toLocaleDateString('en-US', options[format]);
    }
    
    static relative(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 7) return this.format(date);
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }
}

// Toast Notifications
class ToastManager {
    static show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type} fade-in`;
        toast.innerHTML = `
            <div class="toast-icon">${this.getIcon(type)}</div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    static getIcon(type) {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }
}

// Form Validation
class FormValidator {
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static validatePhone(phone) {
        const re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
        return re.test(phone);
    }
    
    static validatePassword(password) {
        return {
            valid: password.length >= 8,
            message: 'Password must be at least 8 characters'
        };
    }
    
    static validateAmount(amount) {
        return {
            valid: amount > 0 && !isNaN(amount),
            message: 'Please enter a valid amount'
        };
    }
    
    static showError(input, message) {
        const formGroup = input.closest('.form-group');
        const errorDiv = formGroup.querySelector('.error-message') || document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        if (!formGroup.querySelector('.error-message')) {
            formGroup.appendChild(errorDiv);
        }
        
        input.classList.add('error');
    }
    
    static clearErrors(form) {
        form.querySelectorAll('.error-message').forEach(el => el.remove());
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    }
}

// Chart Manager
class ChartManager {
    static createLineChart(ctx, data, options = {}) {
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.label,
                    data: data.values,
                    borderColor: '#c6a43f',
                    backgroundColor: 'rgba(198, 164, 63, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { mode: 'index', intersect: false }
                },
                ...options
            }
        });
    }
    
    static createBarChart(ctx, data, options = {}) {
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.label,
                    data: data.values,
                    backgroundColor: '#c6a43f',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                ...options
            }
        });
    }
    
    static createDoughnutChart(ctx, data, options = {}) {
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: ['#c6a43f', '#1a2a4f', '#6c757d', '#28a745'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                ...options
            }
        });
    }
}

// Loading Spinner
class LoadingSpinner {
    static show(element) {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = '<div class="spinner"></div>';
        
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (element) {
            element.style.position = 'relative';
            spinner.style.position = 'absolute';
            spinner.style.top = '50%';
            spinner.style.left = '50%';
            spinner.style.transform = 'translate(-50%, -50%)';
            element.appendChild(spinner);
        }
        
        return spinner;
    }
    
    static hide(spinner) {
        if (spinner && spinner.remove) {
            spinner.remove();
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme manager
    const themeManager = new ThemeManager();
    
    // Add smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    
    // Add mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('show');
        });
    }
    
    // Auto-hide flash messages
    document.querySelectorAll('.flash-message').forEach(msg => {
        setTimeout(() => {
            msg.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => msg.remove(), 300);
        }, 5000);
    });
});

// Export for use in other files
window.CurrencyFormatter = CurrencyFormatter;
window.DateFormatter = DateFormatter;
window.ToastManager = ToastManager;
window.FormValidator = FormValidator;
window.ChartManager = ChartManager;
window.LoadingSpinner = LoadingSpinner;