/**
 * UI.js
 * Utilities for Notifications (Toasts) and Loading States
 */

class UI {
    static init() {
        if (!document.getElementById('toast-container')) {
            const tc = document.createElement('div');
            tc.id = 'toast-container';
            tc.className = 'toast-container';
            document.body.appendChild(tc);
        }
    }

    // --- Toasts ---
    static showToast(message, type = 'info') {
        this.init();
        const container = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = `toast-message ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${this.getIcon(type)}</span>
            <span class="toast-text">${message}</span>
            <span class="toast-close">&times;</span>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => toast.classList.add('show'));

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);

        // Click to remove
        toast.querySelector('.toast-close').onclick = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        };
    }

    static success(msg) { this.showToast(msg, 'success'); }
    static error(msg) { this.showToast(msg, 'error'); }
    static info(msg) { this.showToast(msg, 'info'); }
    static warning(msg) { this.showToast(msg, 'warning'); }

    static getIcon(type) {
        switch(type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    }

    // --- Loaders ---
    static showLoader(container) {
        if (typeof container === 'string') container = document.querySelector(container);
        if (!container) return;

        // Check if already loading
        if (container.querySelector('.loading-spinner')) return;

        // Create overlay
        const loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.innerHTML = '<div class="loading-spinner"></div>';
        
        container.style.position = 'relative'; // Ensure positioning context
        container.appendChild(loader);
    }

    static hideLoader(container) {
        if (typeof container === 'string') container = document.querySelector(container);
        if (!container) return;

        const loader = container.querySelector('.loading-overlay');
        if (loader) loader.remove();
    }
}

window.UI = UI;
