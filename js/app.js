/**
 * App.js V2
 * Refactored for Multi-Page Architecture
 */

class App {
    constructor() {
        this.currentUser = window.Auth.currentUser;
        this.init();
    }

    init() {
        if (!this.currentUser) return;

        this.initTheme();
        this.renderSidebar();
        this.updateUserInfo();

        // Default Route: Admin -> Overview, Others -> Their Dashboard
        let startView = 'admin-overview';
        if (this.currentUser.role === 'exchange_user') startView = 'exchange-dashboard';
        if (this.currentUser.role === 'pharmacy_user') startView = 'pharmacy-dashboard';
        if (this.currentUser.role === 'construction_user') startView = 'construction-dashboard';

        this.navigateTo(startView);

        document.getElementById('logoutBtn').addEventListener('click', () => window.Auth.logout());

        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) themeBtn.addEventListener('click', () => this.toggleTheme());

        // Mobile Sidebar Toggle
        const mobileBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.querySelector('.sidebar');
        if (mobileBtn && sidebar) {
            mobileBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });

            // Close sidebar when clicking outside on mobile (optional but good UX)
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 &&
                    sidebar.classList.contains('open') &&
                    !sidebar.contains(e.target) &&
                    !mobileBtn.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            });
        }

        // Notification Bell
        const notifBtn = document.getElementById('notificationBtn');
        const notifModal = document.getElementById('notification-modal');
        if (notifBtn && notifModal) {
            notifBtn.addEventListener('click', () => {
                this.updateNotifications();
                notifModal.classList.remove('hidden');
            });
            notifModal.querySelector('.close-notif-modal').addEventListener('click', () => {
                notifModal.classList.add('hidden');
            });
        }

        // Admin Dashboard Cards Redirection
        this.initCardRedirects();
    }

    initCardRedirects() {
        // Exchange Card
        const exCard = document.querySelector('.card.stat-card.blue');
        if (exCard) exCard.onclick = () => this.navigateTo('exchange-dashboard');
        if (exCard) exCard.style.cursor = 'pointer';

        // Pharmacy Card
        const phCard = document.querySelector('.card.stat-card.green');
        if (phCard) phCard.onclick = () => this.navigateTo('pharmacy-dashboard');
        if (phCard) phCard.style.cursor = 'pointer';

        // Construction Card
        const coCard = document.querySelector('.card.stat-card.orange');
        if (coCard) coCard.onclick = () => this.navigateTo('construction-dashboard');
        if (coCard) coCard.style.cursor = 'pointer';
    }

    async updateNotifications() {
        const list = document.getElementById('notification-list');
        const badge = document.getElementById('notif-badge');
        list.innerHTML = '';
        let count = 0;

        // 1. Pharmacy Low Stock
        const stock = await window.Store.get('pharmacy_items') || [];
        const lowStock = stock.filter(i => i.qty < 10);
        lowStock.forEach(i => {
            count++;
            list.innerHTML += `
                <li class="notif-item warning">
                    <div>
                        <strong>Low Stock: ${i.name}</strong><br>
                        <small>Only ${i.qty} left</small>
                    </div>
                </li>
            `;
        });

        // 2. Pharmacy Expiry Alerts
        const today = new Date();
        const expiring = stock.filter(i => {
            if (!i.exp_date) return false;
            const exp = new Date(i.exp_date);
            const diffTime = exp - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays < 30; // Alert if less than 30 days
        });

        expiring.forEach(i => {
            count++;
            list.innerHTML += `
                <li class="notif-item danger">
                    <div>
                        <strong>Expiring Soon: ${i.name}</strong><br>
                        <small>Expires on ${i.exp_date}</small>
                    </div>
                </li>
            `;
        });

        // 3. Recent Activities (Mock)
        // ... could add more alerts here

        if (count === 0) list.innerHTML = '<li class="empty-state">No new notifications</li>';

        if (count > 0) {
            badge.style.display = 'block';
            badge.textContent = count;
        } else {
            badge.style.display = 'none';
        }
    }

    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        this.updateThemeIcon(next);
    }

    updateThemeIcon(theme) {
        const btn = document.getElementById('themeToggle');
        if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    updateUserInfo() {
        document.getElementById('displayUsername').textContent = this.currentUser.name;
        document.getElementById('displayRole').textContent = this.currentUser.role.replace('_', ' ').toUpperCase();
    }

    renderSidebar() {
        const sidebar = document.getElementById('sidebar-menu');
        sidebar.innerHTML = '';

        const structure = [
            {
                header: 'Main',
                roles: ['admin'],
                items: [
                    { id: 'admin-overview', label: 'Overview', icon: '📊' },
                    { id: 'admin-analytics', label: 'Reports & Analytics', icon: '📈' }
                ]
            },
            {
                header: 'Money Exchange',
                roles: ['admin', 'exchange_user'],
                items: [
                    { id: 'exchange-dashboard', label: 'Dashboard', icon: '📈' },
                    { id: 'exchange-buy', label: 'Buy Currency', icon: '📥', submenu: true },
                    { id: 'exchange-sell', label: 'Sell Currency', icon: '📤', submenu: true },
                    { id: 'exchange-holdings', label: 'Vault Holdings', icon: '🏦', submenu: true },
                    { id: 'exchange-rates', label: 'Set Rates', icon: '⚙️', submenu: true },
                    { id: 'exchange-records', label: 'Transactions', icon: '📝', submenu: true }
                ]
            },
            {
                header: 'Pharmacy',
                roles: ['admin', 'pharmacy_user'],
                items: [
                    { id: 'pharmacy-dashboard', label: 'Dashboard', icon: '🏥' },
                    { id: 'pharmacy-pos', label: 'Point of Sale', icon: '🛒', submenu: true },
                    { id: 'pharmacy-stock', label: 'Stock Management', icon: '📦', submenu: true },
                    { id: 'pharmacy-records', label: 'Sales History', icon: '📑', submenu: true }
                ]
            },
            {
                header: 'Construction',
                roles: ['admin', 'construction_user'],
                items: [
                    { id: 'construction-dashboard', label: 'Dashboard', icon: '🏗️' },
                    { id: 'construction-sites', label: 'Manage Sites', icon: '📍', submenu: true },
                    { id: 'construction-expense', label: 'Log Expense', icon: '💸', submenu: true },
                    { id: 'construction-income', label: 'Log Income', icon: '💰', submenu: true },
                    { id: 'construction-records', label: 'Financials', icon: '📋', submenu: true }
                ]
            }
        ];

        // Accordion Render
        structure.forEach((section, index) => {
            if (this.hasAccess(section.roles)) {

                // 1. Header
                const catHeader = document.createElement('div');
                catHeader.className = 'nav-category';
                catHeader.innerHTML = `<span>${section.header}</span> <span class="arrow">▼</span>`;

                // 2. Items Container
                const itemsGroup = document.createElement('ul');
                itemsGroup.className = 'nav-item-group';
                if (index === 0) itemsGroup.classList.add('open'); // Expand first by default

                // Toggle Logic
                catHeader.onclick = () => {
                    // Close others? Optional. Let's keep multiple open support.
                    // Toggle current
                    itemsGroup.classList.toggle('open');
                    catHeader.classList.toggle('active-cat');
                };

                // Populate Items
                section.items.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'menu-item';
                    li.dataset.target = item.id;
                    li.innerHTML = `<span class="icon">${item.icon}</span> ${item.label}`;
                    li.onclick = () => {
                        this.navigateTo(item.id);
                        // Make sure parent is open
                        if (!itemsGroup.classList.contains('open')) {
                            itemsGroup.classList.add('open');
                            catHeader.classList.add('active-cat');
                        }
                        // Mobile: Close sidebar on selection
                        if (window.innerWidth <= 768) {
                            document.querySelector('.sidebar').classList.remove('open');
                        }
                    };
                    itemsGroup.appendChild(li);
                });

                sidebar.appendChild(catHeader);
                sidebar.appendChild(itemsGroup);
            }
        });
    }

    hasAccess(allowedRoles) {
        if (this.currentUser.role === 'admin') return true;
        return allowedRoles.includes(this.currentUser.role);
    }

    navigateTo(viewId) {
        // Toggle Active State in Sidebar
        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
        const link = document.querySelector(`.menu-item[data-target="${viewId}"]`);
        if (link) link.classList.add('active');

        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

        // Show target view
        const target = document.getElementById(`view-${viewId}`);
        if (target) {
            target.classList.remove('hidden');
            this.handleViewLoad(viewId);
        }
    }

    handleViewLoad(viewId) {
        // Trigger specific logic when a view loads
        const [module, action] = viewId.split('-'); // e.g., 'exchange-buy' -> module='exchange', action='buy'

        console.log(`Navigating to: ${module} -> ${action}`);

        if (module === 'admin') {
            if (action === 'analytics') {
                this.renderAdminAnalytics();
            } else {
                this.renderAdminDashboard();
            }
        }

        // Delegate to module controllers if they exist
        if (module === 'exchange' && window.ExchangeModule) window.ExchangeModule.onViewLoad(action);
        if (module === 'pharmacy' && window.PharmacyModule) window.PharmacyModule.onViewLoad(action);
        if (module === 'construction' && window.ConstructionModule) window.ConstructionModule.onViewLoad(action);
    }

    async renderAdminDashboard() {
        // Aggregation Logic for Admin
        if (window.ExchangeModule) await window.ExchangeModule.updateStats();
        if (window.PharmacyModule) await window.PharmacyModule.updateStats();
        if (window.ConstructionModule) await window.ConstructionModule.updateStats();

        // Calculate Net Platform Profit (Estimate)
        // Exchange: Estimate profit as 1% of volume (mock logic) or just use volume for now?
        // Let's use: Pharmacy Sales + Construction Balance + (Exchange Volume * 0.01)

        const exTx = await window.Store.get('exchange_transactions') || [];
        const exVol = exTx.reduce((a, c) => a + (c.amount * c.rate), 0);
        const exProfit = exVol * 0.02; // Assume 2% spread revenue

        const phTx = await window.Store.get('pharmacy_sales') || [];
        const phRev = phTx.reduce((a, c) => a + c.total, 0); // Revenue, not profit, but approx for now

        const coExp = await window.Store.get('construction_expenses') || [];
        const coInc = await window.Store.get('construction_income') || [];
        const coBal = coInc.reduce((a, c) => a + c.amount, 0) - coExp.reduce((a, c) => a + c.amount, 0);

        const netProfit = exProfit + phRev + coBal;

        const npEl = document.getElementById('stat-net-profit');
        if (npEl) npEl.textContent = netProfit.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

        await this.renderActivityStream();
    }

    renderAdminAnalytics() {
        // Load analytics script if not already loaded
        if (!window.Analytics) {
            const script = document.createElement('script');
            script.src = 'js/analytics.js';
            script.onload = () => {
                if (window.Analytics && window.Analytics.renderAnalytics) {
                    window.Analytics.renderAnalytics();
                }
            };
            document.head.appendChild(script);
        } else {
            window.Analytics.renderAnalytics();
        }
    }

    async renderActivityStream() {
        const streamContainer = document.getElementById('activity-stream');
        if (!streamContainer) return;

        // Collect all transactions
        let activities = [];

        // Exchange
        const exTx = await window.Store.get('exchange_transactions') || [];
        activities = activities.concat(exTx.map(t => ({
            time: t.date,
            desc: `Exchange: ${t.type.toUpperCase()} ${t.currency} ${t.amount}`,
            type: 'exchange'
        })));

        // Pharmacy
        const phTx = await window.Store.get('pharmacy_sales') || [];
        activities = activities.concat(phTx.map(t => ({
            time: t.date ? t.date : new Date().toISOString(), // fallback
            desc: `Pharmacy: Sale of $${t.total.toFixed(2)}`,
            type: 'pharmacy'
        })));

        // Construction
        const coExp = await window.Store.get('construction_expenses') || [];
        const coInc = await window.Store.get('construction_income') || [];
        activities = activities.concat(coExp.map(t => ({
            time: t.date, desc: `Construction: Expense - ${t.description}`, type: 'construction'
        })));
        activities = activities.concat(coInc.map(t => ({
            time: t.date, desc: `Construction: Income - ${t.description}`, type: 'construction'
        })));

        // Sort & Slice
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        const recent = activities.slice(0, 10);

        streamContainer.innerHTML = '';
        recent.forEach(act => {
            streamContainer.innerHTML += `
                <li class="activity-item">
                    <span class="activity-time">${new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span class="activity-desc">${act.desc}</span>
                </li>
            `;
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.Auth.checkAuth();
    window.App = new App();
});
