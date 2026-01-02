/**
 * Construction.js V2
 * Construction Management Module Multi-View with Site Support
 */

class ConstructionModule {
    constructor() {
        this.sitesKey = 'construction_sites';
        this.expKey = 'construction_expenses';
        this.incKey = 'construction_income';
        this.initListeners();
        this.initForms();
    }

    initListeners() {
        document.addEventListener('click', (e) => {
            if(e.target.id === 'btn-site-add') this.openAddSiteModal();
            // Add other button IDs here
        });
    }

    onViewLoad(action) {
        // Always refresh stats when entering module
        this.updateStats();

        switch (action) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'sites':
                this.renderSites();
                break;
            case 'expense':
            case 'income':
                this.populateSiteSelects();
                break;
            case 'records':
                this.renderRecords();
                break;
        }
    }

    // --- Sites Management ---
    async populateSiteSelects() {
        const sites = await window.Store.get(this.sitesKey) || [];
        // Only show Active sites in dropdown
        const activeSites = sites.filter(s => s.status === 'Active');

        const opts = activeSites.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
        const defaultOpt = '<option value="" disabled selected>Select Site...</option>';

        const expSelect = document.getElementById('exp-site');
        if (expSelect) expSelect.innerHTML = defaultOpt + opts;

        const incSelect = document.getElementById('inc-site');
        if (incSelect) incSelect.innerHTML = defaultOpt + opts;
    }

    openAddSiteModal() {
        const modal = document.getElementById('modal-container');
        const modalBody = document.getElementById('modal-body');
        document.getElementById('modal-title').textContent = 'Add New Construction Site';

        modalBody.innerHTML = `
            <form id="add-site-form">
                <div class="form-group">
                    <label>Site Name</label>
                    <input type="text" id="new-site-name" class="form-control" placeholder="e.g. City Center Mall" required>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="new-site-status" class="form-control">
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                        <option value="On Hold">On Hold</option>
                    </select>
                </div>
                <button type="submit" class="btn-primary full-width">Save Site</button>
            </form>
        `;

        modal.classList.remove('hidden');

        // Handle Escape key
        const close = () => modal.classList.add('hidden');
        document.querySelector('.close-modal').onclick = close;

        document.getElementById('add-site-form').onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('new-site-name').value;
            const status = document.getElementById('new-site-status').value;

            await this.saveSite({ name, status });

            alert('Site Added Successfully');
            close();
            this.renderSites(); // Refresh list if visible
        };
    }

    async saveSite(site) {
        await window.Store.add(this.sitesKey, site);
        this.renderSites();
    }

    async renderSites() {
        const sites = await window.Store.get(this.sitesKey) || [];
        const tbody = document.getElementById('construction-sites-body');
        if (!tbody) return;

        if (sites.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No sites found. Add one to get started.</td></tr>';
            return;
        }

        tbody.innerHTML = sites.map(s => `
            <tr>
                <td><strong>${s.name}</strong></td>
                <td>
                    <span class="role-badge" style="background-color: ${this.getStatusColor(s.status)}">
                        ${s.status}
                    </span>
                </td>
                <td>
                    <button class="btn-secondary" style="padding:0.2rem 0.5rem; font-size: 0.8rem">Manage</button>
                </td>
            </tr>
        `).join('');
    }

    getStatusColor(status) {
        if (status === 'Active') return 'var(--success)';
        if (status === 'Completed') return 'var(--info)';
        return 'var(--secondary)';
    }

    // --- Dashboard ---
    async renderDashboard() {
        const expenses = await window.Store.get(this.expKey) || [];
        const incomes = await window.Store.get(this.incKey) || [];

        const totExp = expenses.reduce((a, c) => a + c.amount, 0);
        const totInc = incomes.reduce((a, c) => a + c.amount, 0);
        const bal = totInc - totExp;

        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
        };

        setTxt('cons-dash-expense', totExp);
        setTxt('cons-dash-income', totInc);
        setTxt('cons-dash-balance', bal);
    }

    async updateStats() {
        const expenses = await window.Store.get(this.expKey) || [];
        const incomes = await window.Store.get(this.incKey) || [];
        const totExp = expenses.reduce((a, c) => a + c.amount, 0);
        const totInc = incomes.reduce((a, c) => a + c.amount, 0);

        const el = document.getElementById('stat-construction');
        if (el) el.textContent = (totInc - totExp).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    }

    // --- Forms ---
    initForms() {
        const handleForm = (formId, type, key) => {
            const form = document.getElementById(formId);
            if (form) {
                // Remove old listeners? Hard without named function. 
                // Assuming simple page load architecture, multiple listeners shouldn't stack if script runs once.
                form.addEventListener('submit', (e) => {
                    e.preventDefault();

                    const descId = type === 'expense' ? 'exp-desc' : 'inc-desc';
                    const amtId = type === 'expense' ? 'exp-amount' : 'inc-amount';
                    const dateId = type === 'expense' ? 'exp-date' : 'inc-date';
                    const siteId = type === 'expense' ? 'exp-site' : 'inc-site';

                    const siteVal = document.getElementById(siteId).value;
                    if (!siteVal) {
                        alert("Please select a Site.");
                        return;
                    }

                    const data = {
                        site: siteVal,
                        description: document.getElementById(descId).value,
                        amount: parseFloat(document.getElementById(amtId).value),
                        date: document.getElementById(dateId).value, // YYYY-MM-DD
                        type: type
                    };

                    this.saveTransaction(key, data);
                    form.reset();
                    // Reset date to today and re-populate sites just in case
                    document.getElementById(dateId).value = new Date().toISOString().split('T')[0];
                    this.populateSiteSelects();
                });
            }
        };

        handleForm('construction-expense-form', 'expense', this.expenseKey);
        handleForm('construction-income-form', 'income', this.incomeKey);
    }

    saveTransaction(key, data) {
        data.date = new Date(data.date).toISOString();
        window.Store.add(key, data);
        alert('Transaction Saved');
        this.updateStats();
    }

    // --- Records ---
    renderRecords() {
        const expenses = (window.Store.get(this.expenseKey) || []).map(i => ({ ...i, cat: 'expense' }));
        const incomes = (window.Store.get(this.incomeKey) || []).map(i => ({ ...i, cat: 'income' }));
        const all = [...expenses, ...incomes];

        all.sort((a, b) => new Date(b.date) - new Date(a.date));

        const tbody = document.getElementById('construction-records-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (all.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No records found.</td></tr>';
            return;
        }

        all.forEach(tx => {
            const color = tx.cat === 'income' ? 'var(--success)' : 'var(--danger)';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(tx.date).toLocaleDateString()}</td>
                <td><span style="color:${color};font-weight:bold">${tx.cat.toUpperCase()}</span></td>
                <td>
                    <span style="font-size:0.85rem; background:var(--bg-body); padding:2px 6px; border-radius:4px; margin-right:5px">
                        ${tx.site || 'General'}
                    </span>
                    ${tx.description}
                </td>
                <td style="color:${color}; font-weight:600">
                    ${tx.cat === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

window.ConstructionModule = new ConstructionModule();
