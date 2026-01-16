/**
 * Auth.js
 * Handles Login, Logout, and Role Checks
 */

class Auth {
    constructor() {
        this.currentUser = JSON.parse(sessionStorage.getItem('active_user'));
    }

    async login(username, password) {
        try {
            const res = await fetch('api/auth.php?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (data.success) {
                sessionStorage.setItem('active_user', JSON.stringify(data.user));
                this.currentUser = data.user;
                return { success: true, user: data.user };
            } else {
                return { success: false, message: data.message };
            }
        } catch (e) {
            console.error(e);
            return { success: false, message: 'Connection Error' };
        }
    }

    logout() {
        sessionStorage.removeItem('active_user');
        window.location.href = 'index.html';
    }

    checkAuth() {
        // Simple check: if no user and not on index.html, redirect
        const path = window.location.pathname;
        const isLoginPage = path.endsWith('index.html') || path.endsWith('/');
        
        if (!this.currentUser && !isLoginPage) {
            window.location.href = 'index.html';
        }
    }

    hasAccess(module) {
        if (!this.currentUser) return false;
        if (this.currentUser.role === 'admin') return true;

        const permissions = {
            'exchange_user': ['exchange'],
            'pharmacy_user': ['pharmacy'],
            'construction_user': ['construction']
        };

        const allowedModules = permissions[this.currentUser.role] || [];
        return allowedModules.includes(module);
    }
}

const auth = new Auth();
window.Auth = auth;
