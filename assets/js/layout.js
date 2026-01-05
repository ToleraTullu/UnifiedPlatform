/**
 * Layout.js
 * Handles Sidebar, Topbar, and Navigation
 */

class Layout {
    constructor() {
        this.basePath = this.determineBasePath();
        // this.checkAuth(); // Auth check is good
    }

    determineBasePath() {
        // Simple heuristic: count how many levels deep we are relative to the root 'UnifiedPlatform'
        // If we in 'modules/exchange/buy.html', we are 2 deep? 
        if (window.location.href.includes('/modules/')) return '../../';
        if (window.location.href.includes('/admin/')) return '../';
        // fallback
        return '';
    }

    ensureLayoutContainers() {
        // If the page doesn't include the expected layout placeholders, create them
        if (!document.querySelector('.sidebar')) {
            const sb = document.createElement('aside');
            sb.className = 'sidebar';
            // insert at top so it's available for styling/positioning
            document.body.insertBefore(sb, document.body.firstChild);
        }

        if (!document.querySelector('.topbar')) {
            const tb = document.createElement('header');
            tb.className = 'topbar';
            // place after sidebar (or at top)
            const first = document.querySelector('.sidebar').nextSibling;
            if (first) document.body.insertBefore(tb, first);
            else document.body.appendChild(tb);
        }

        // Ensure main content wrapper exists so styles like .main-content apply
        if (!document.querySelector('.main-content')) {
            const main = document.createElement('main');
            main.className = 'main-content';
            // move existing body children (except sidebar/topbar) into main
            const sidebarEl = document.querySelector('.sidebar');
            const topbarEl = document.querySelector('.topbar');

            // collect nodes to move
            const nodes = [];
            document.body.childNodes.forEach(n => {
                if (n === sidebarEl || n === topbarEl) return;
                nodes.push(n);
            });

            nodes.forEach(n => main.appendChild(n));

            // append main
            document.body.appendChild(main);
        }

        // Ensure Modal Container exists for popups
        if (!document.getElementById('modal-container')) {
            const modal = document.createElement('div');
            modal.id = 'modal-container';
            modal.className = 'modal hidden';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h2 id="modal-title">Title</h2>
                    <div id="modal-body"></div>
                </div>
            `;
            document.body.appendChild(modal);

            // Close logic
            modal.querySelector('.close-modal').onclick = () => modal.classList.add('hidden');
            window.onclick = (event) => {
                if (event.target == modal) modal.classList.add('hidden');
            };
        }
    }

    checkAuth() {
        // Verify user is logged in
        if (!sessionStorage.getItem('active_user') && !window.location.href.endsWith('index.html')) {
            window.location.href = this.basePath + 'index.html';
        }
    }

    logout() {
        sessionStorage.removeItem('active_user');
        window.location.href = this.basePath + 'index.html';
    }

    renderSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        const bp = this.basePath;
        const user = JSON.parse(sessionStorage.getItem('active_user') || '{}');
        const role = user.role;

        // Helper to check role access
        const hasAccess = (roles) => role === 'admin' || roles.includes(role);

        // Sidebar Content
        sidebar.innerHTML = `
            <div class="brand">
                <h2>UniManage</h2>
            </div>
            <nav class="nav-menu">
                <ul id="sidebar-menu"></ul>
            </nav>
        `;

        const menuCtx = document.getElementById('sidebar-menu');

        const structure = [
            {
                header: 'Main',
                roles: ['admin'],
                items: [
                    { label: 'Overview', icon: '📊', link: 'admin/dashboard.html' }
                ]
            },
            {
                header: 'Administration',
                roles: ['admin'],
                items: [
                    { label: 'Users', icon: '👥', link: 'admin/users.html' },
                    { label: 'Bank Accounts', icon: '🏦', link: 'admin/banks.html' },
                    { label: 'System Logs', icon: '📋', link: 'admin/logs.html' }
                ]
            },
            {
                header: 'Money Exchange',
                roles: ['admin', 'exchange_user'],
                items: [
                    { label: 'Dashboard', icon: '📈', link: 'modules/exchange/dashboard.html' },
                    { label: 'Holdings', icon: '💼', link: 'modules/exchange/stock.html' },
                    { label: 'Manage Rates', icon: '⚙️', link: 'modules/exchange/manage.html', adminOnly: true },
                    { label: 'Buy Currency', icon: '📥', link: 'modules/exchange/buy.html' },
                    { label: 'Sell Currency', icon: '📤', link: 'modules/exchange/sell.html' },
                    { label: 'Transactions', icon: '📝', link: 'modules/exchange/records.html' }
                ]
            },
            {
                header: 'Pharmacy',
                roles: ['admin', 'pharmacy_user'],
                items: [
                    { label: 'Dashboard', icon: '🏥', link: 'modules/pharmacy/dashboard.html' },
                    { label: 'Point of Sale', icon: '🛒', link: 'modules/pharmacy/pos.html' },
                    { label: 'Stock Mgmt', icon: '📦', link: 'modules/pharmacy/stock.html' },
                    { label: 'Sales History', icon: '📑', link: 'modules/pharmacy/records.html' }
                ]
            },
            {
                header: 'Construction',
                roles: ['admin', 'construction_user'],
                items: [
                    { label: 'Dashboard', icon: '🏗️', link: 'modules/construction/dashboard.html' },
                    { label: 'Log Expense', icon: '💸', link: 'modules/construction/expense.html' },
                    { label: 'Log Income', icon: '💰', link: 'modules/construction/income.html' },
                    { label: 'Financials', icon: '📋', link: 'modules/construction/records.html' }
                ]
            }
        ];

        structure.forEach(section => {
            if (hasAccess(section.roles)) {
                if (section.header) {
                    const h = document.createElement('li');
                    h.className = 'menu-category'; 
                    h.textContent = section.header;
                    menuCtx.appendChild(h);
                }
                section.items.forEach(item => {
                    // skip admin-only items for non-admins
                    if (item.adminOnly && role !== 'admin') return;
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <a href="${bp + item.link}" class="menu-item">
                            <span class="icon">${item.icon}</span> ${item.label}
                        </a>
                    `;
                    menuCtx.appendChild(li);
                });
            }
        });
    }

    renderTopbar() {
        const topbar = document.querySelector('.topbar');
        if (!topbar) return;

        const user = JSON.parse(sessionStorage.getItem('active_user') || '{}');
        const roleLabel = user.role ? user.role.replace('_', ' ').toUpperCase() : 'GUEST';

        // Keep existing page title logic if it exists, roughly
        const pageTitle = document.title.split('-')[1] || 'Dashboard';

        topbar.innerHTML = `
            <div class="page-title"><button id="navToggle" class="burger" aria-label="Toggle navigation"><span class="bar"></span><span class="bar"></span><span class="bar"></span></button><h2>${pageTitle}</h2></div>
            <div class="user-info">
                <button id="notificationBtn" class="notification-btn" title="Notifications">🔔 <span id="notificationCount" class="notification-count" style="display:none;">0</span></button>
                <span class="username">${user.name || 'User'}</span>
                <span class="role-badge">${roleLabel}</span>
                <button id="logoutBtn" class="logout-btn">Logout</button>
            </div>
        `;

        // Toggle sidebar on mobile, manage overlay, and animate burger
        const navToggle = document.getElementById('navToggle');
        const sidebar = document.querySelector('.sidebar');
        if (navToggle && sidebar) {
            // ensure overlay exists
            let overlay = document.getElementById('sidebarOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sidebarOverlay';
                overlay.className = 'sidebar-overlay';
                document.body.appendChild(overlay);
            }

            // click burger to toggle
            navToggle.addEventListener('click', () => {
                // toggle sidebar
                sidebar.classList.toggle('open-mobile');
                const open = sidebar.classList.contains('open-mobile');
                // animate burger
                navToggle.classList.toggle('open', open);
                // show/hide overlay
                overlay.classList.toggle('open', open);
            });

            // click overlay to close
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open-mobile');
                navToggle.classList.remove('open');
                overlay.classList.remove('open');
            });

            // auto-close sidebar when a menu item is selected (mobile)
            document.addEventListener('click', (ev) => {
                const target = ev.target.closest && ev.target.closest('.menu-item');
                if (target && sidebar.classList.contains('open-mobile')) {
                    // allow navigation to proceed but close UI immediately
                    sidebar.classList.remove('open-mobile');
                    navToggle.classList.remove('open');
                    overlay.classList.remove('open');
                }
            });
        }

        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Notification system
        this.initNotifications();
    }

    initNotifications() {
        // Stub
    }
}
