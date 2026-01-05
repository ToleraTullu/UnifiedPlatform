class AdminModule {
    constructor() {
        this.usersKey = 'unified_users';
        this.banksKey = 'bank_accounts';
        this.logsKey = 'activity_logs';
    }

    // --- User Management ---
    async initUsers() {
        const user = window.Auth && window.Auth.currentUser;
        if (!user || user.role !== 'admin') {
            document.getElementById('no-access-users').style.display = 'block';
            document.getElementById('user-form').style.display = 'none';
            return;
        }

        const form = document.getElementById('user-form');
        const cancelBtn = document.getElementById('cancel-btn-user');
        
        // Remove old listeners to avoid duplicates
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        newForm.addEventListener('submit', (e) => this.handleUserSubmit(e));
        
        const newCancel = document.getElementById('cancel-btn-user');
        newCancel.onclick = () => this.resetUserForm();

        await this.renderUsers();
    }

    async renderUsers() {
        const users = await window.Store.get(this.usersKey) || [];
        const tbody = document.getElementById('users-body');
        tbody.innerHTML = '';

        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:600">${u.name || u.username}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted)">@${u.username}</div>
                </td>
                <td>
                    <span class="badge badge-exchange">${u.role.replace('_', ' ')}</span>
                </td>
                <td style="text-align:right">
                    <button class="btn-secondary edit-user" data-user="${u.username}" style="padding:5px 10px; font-size:0.8rem;">Edit</button> 
                    <button class="btn-danger delete-user" data-user="${u.username}" style="padding:5px 10px; font-size:0.8rem;">Delete</button>
                </td>`;
            tbody.appendChild(tr);
        });

        // Event Delegation for Actions
        tbody.onclick = (ev) => {
            const btn = ev.target.closest('button');
            if (!btn) return;
            const uname = btn.dataset.user;
            if (btn.classList.contains('delete-user')) this.deleteUser(uname);
            else if (btn.classList.contains('edit-user')) this.editUser(uname);
        };
    }

    async handleUserSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const fd = new FormData(form);
        const uname = fd.get('username').trim();
        const editMode = document.getElementById('edit-mode').value;
        let users = await window.Store.get(this.usersKey) || [];

        if (editMode) {
            const idx = users.findIndex(u => u.username === editMode);
            if (idx !== -1) {
                users[idx].name = fd.get('name');
                users[idx].role = fd.get('role');
                if (fd.get('password')) users[idx].password = fd.get('password');
            }
        } else {
            if (users.some(u => u.username === uname)) return alert('Username already exists');
            users.push({
                username: uname,
                password: fd.get('password'),
                name: fd.get('name') || '',
                role: fd.get('role')
            });
        }

        await window.Store.set(this.usersKey, users);
        this.resetUserForm();
        await this.renderUsers();
    }

    async deleteUser(uname) {
        if (!confirm('Delete user @' + uname + '?')) return;
        let users = await window.Store.get(this.usersKey) || [];
        users = users.filter(u => u.username !== uname);
        await window.Store.set(this.usersKey, users);
        await this.renderUsers();
    }

    async editUser(uname) {
        const users = await window.Store.get(this.usersKey) || [];
        const u = users.find(x => x.username === uname);
        if (!u) return;

        document.getElementById('edit-mode').value = u.username;
        document.getElementById('u-username').value = u.username;
        document.getElementById('u-username').disabled = true;
        document.getElementById('u-name').value = u.name || '';
        document.getElementById('u-role').value = u.role;
        document.getElementById('u-password').required = false;
        document.getElementById('u-password').placeholder = '(Leave blank to keep same)';

        document.getElementById('submit-btn-user').textContent = 'Update User';
        document.getElementById('cancel-btn-user').style.display = 'block';
    }

    resetUserForm() {
        const form = document.getElementById('user-form');
        form.reset();
        document.getElementById('edit-mode').value = '';
        document.getElementById('u-username').disabled = false;
        document.getElementById('u-password').required = true;
        document.getElementById('u-password').placeholder = '••••••••';
        document.getElementById('submit-btn-user').textContent = 'Create User';
        document.getElementById('cancel-btn-user').style.display = 'none';
    }

    // --- Bank Management ---
    async initBanks() {
        const user = window.Auth && window.Auth.currentUser;
        if (!user || user.role !== 'admin') {
            document.getElementById('no-access-banks').style.display = 'block';
            document.getElementById('bank-form').style.display = 'none';
            return;
        }

        const form = document.getElementById('bank-form');
        const cancelBtn = document.getElementById('cancel-btn-bank');

        // Reset listeners
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        newForm.addEventListener('submit', (e) => this.handleBankSubmit(e));

        const newCancel = document.getElementById('cancel-btn-bank');
        newCancel.onclick = () => this.resetBankForm();

        await this.renderBanks();
    }

    async renderBanks() {
        const banks = await window.Store.get(this.banksKey) || [];
        const tbody = document.getElementById('banks-body');
        tbody.innerHTML = '';

        banks.forEach(b => {
            const sectors = Array.isArray(b.sectors) ? b.sectors.map(s => {
                const badgeClass = `badge-${s}`;
                return `<span class="badge ${badgeClass}" style="margin-right:4px;">${s}</span>`;
            }).join('') : '<span class="text-muted">All Sectors</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:600">${b.bank_name}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted)">Acc: ${b.account_number}</div>
                </td>
                <td>${b.account_holder}</td>
                <td>${sectors}</td>
                <td style="text-align:right">
                    <button class="btn-secondary edit-bank" data-id="${b.id}" style="padding:5px 10px; font-size:0.8rem;">Edit</button> 
                    <button class="btn-danger delete-bank" data-id="${b.id}" style="padding:5px 10px; font-size:0.8rem;">Delete</button>
                </td>`;
            tbody.appendChild(tr);
        });

        tbody.onclick = (ev) => {
            const btn = ev.target.closest('button');
            if (!btn) return;
            const id = parseInt(btn.dataset.id);
            if (btn.classList.contains('delete-bank')) this.deleteBank(id);
            else if (btn.classList.contains('edit-bank')) this.editBank(id);
        };
    }

    async handleBankSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const fd = new FormData(form);
        const sectors = [];
        form.querySelectorAll('input[name="sector"]:checked').forEach(cb => sectors.push(cb.value));

        const hiddenId = document.getElementById('bank-id').value;
        const bankObj = {
            id: hiddenId ? parseInt(hiddenId) : Date.now(),
            bank_name: fd.get('bank_name'),
            account_number: fd.get('account_number'),
            account_holder: fd.get('account_holder'),
            sectors: sectors.length > 0 ? sectors : ['exchange', 'pharmacy', 'construction']
        };

        let banks = await window.Store.get(this.banksKey) || [];
        if (hiddenId) {
            const idx = banks.findIndex(b => b.id == bankObj.id);
            if (idx !== -1) banks[idx] = bankObj;
        } else {
            banks.push(bankObj);
        }

        await window.Store.set(this.banksKey, banks);
        this.resetBankForm();
        await this.renderBanks();
    }

    async deleteBank(id) {
        if (!confirm('Delete this bank account?')) return;
        let banks = await window.Store.get(this.banksKey) || [];
        banks = banks.filter(b => b.id !== id);
        await window.Store.set(this.banksKey, banks);
        await this.renderBanks();
    }

    async editBank(id) {
        const banks = await window.Store.get(this.banksKey) || [];
        const b = banks.find(x => x.id === id);
        if (!b) return;

        const form = document.getElementById('bank-form');
        document.getElementById('bank-id').value = b.id;
        form.querySelector('[name="bank_name"]').value = b.bank_name;
        form.querySelector('[name="account_number"]').value = b.account_number;
        form.querySelector('[name="account_holder"]').value = b.account_holder;

        form.querySelectorAll('input[name="sector"]').forEach(cb => cb.checked = false);
        if (Array.isArray(b.sectors)) {
            b.sectors.forEach(s => {
                const cb = form.querySelector(`input[name="sector"][value="${s}"]`);
                if (cb) cb.checked = true;
            });
        }

        document.getElementById('submit-btn-bank').textContent = 'Update Account';
        document.getElementById('cancel-btn-bank').style.display = 'block';
    }

    resetBankForm() {
        const form = document.getElementById('bank-form');
        form.reset();
        document.getElementById('bank-id').value = '';
        document.getElementById('submit-btn-bank').textContent = 'Save Account';
        document.getElementById('cancel-btn-bank').style.display = 'none';
    }

    // --- System Logs ---
    async initLogs() {
        const refreshBtn = document.getElementById('refreshLogs');
        const clearBtn = document.getElementById('clearLogs');

        refreshBtn.onclick = () => this.renderLogs();
        clearBtn.onclick = () => this.clearLogs();

        await this.renderLogs();
    }

    async renderLogs() {
        const logs = await window.Store.getActivityLogs();
        const tbody = document.getElementById('logsTableBody');

        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No activity logs found</td></tr>';
            return;
        }

        const colors = {
            'ADD': '#10b981',
            'DELETE': '#ef4444',
            'EDIT': '#4f46e5',
            'LOGIN': '#f59e0b',
            'LOGOUT': '#64748b'
        };

        tbody.innerHTML = logs.map(log => {
            const color = colors[log.action_type] || '#64748b';
            return `
                <tr>
                    <td style="font-size:0.85rem; color:var(--text-muted)">${new Date(log.timestamp).toLocaleString()}</td>
                    <td style="font-weight:600">@${log.current_user}</td>
                    <td>
                        <span class="badge" style="background:${color}; color:white;">
                            ${log.action_type}
                        </span>
                    </td>
                    <td>${log.module_name}</td>
                    <td>${log.details || '-'}</td>
                </tr>
            `;
        }).join('');
    }

    async clearLogs() {
        if (confirm('Are you sure you want to clear all activity logs? This action cannot be undone.')) {
            await window.Store.set(this.logsKey, []);
            await this.renderLogs();
        }
    }
}

window.AdminModule = new AdminModule();
