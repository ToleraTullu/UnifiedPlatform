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
                // Restrict date to today only
                const today = new Date().toISOString().split('T')[0];
                const dateInputId = action === 'expense' ? 'exp-date' : 'inc-date';
                const dateInput = document.getElementById(dateInputId);
                if (dateInput) {
                    dateInput.min = today;
                    dateInput.max = today;
                    dateInput.value = today; // Set default to today
                }
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
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const siteId = type === 'expense' ? 'exp-site' : 'inc-site';
                    const siteVal = document.getElementById(siteId).value;
                    if (!siteVal) {
                        alert("Please select a Site.");
                        return;
                    }

                    this.showPaymentModal(type, key, form);
                });
            }
        };

        handleForm('construction-expense-form', 'expense', this.expKey);
        handleForm('construction-income-form', 'income', this.incKey);
    }

    async showPaymentModal(type, key, activeForm) {
        const modal = document.getElementById('modal-container');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        const fd = new FormData(activeForm);
        const amount = parseFloat(fd.get('amount') || activeForm.querySelector('[name="amount"]')?.value || 0);
        console.log(amount);
        const site = fd.get('site') || activeForm.querySelector('select')?.value || 'N/A';

        title.textContent = 'Finalize Payment';
        
        // Fetch eligible banks
        const allBanks = await window.Store.get('bank_accounts') || [];
        const sectorBanks = allBanks.filter(b => !b.sectors || b.sectors.includes('construction') || b.sectors === 'all');
        const bankOptions = sectorBanks.map(b => `<option value="${b.id}">${b.bank_name} - ${b.account_number}</option>`).join('');

        body.innerHTML = `
            <div style="margin-bottom:20px; padding:15px; background:var(--bg-input); border-radius:8px; text-align:center;">
                <div style="font-size:0.9rem; color:var(--text-muted); text-transform:uppercase;">Total Amount to ${type === 'expense' ? 'PAY' : 'RECEIVE'}</div>
                <div style="font-size:2rem; font-weight:800; color:var(--text-main);">${amount.toFixed(2)} <span style="font-size:1rem; font-weight:400;">USD</span></div>
                <div style="font-size:0.9rem; margin-top:5px;">Site: ${site}</div>
            </div>

            <form id="payment-finalize-form">
                <div class="form-group">
                    <label>Payment Method</label>
                    <div style="display:flex; gap:20px; margin-top:5px;">
                        <label style="display:flex; align-items:center; gap:8px; font-weight:normal; cursor:pointer;">
                            <input type="radio" name="payment_method" value="cash" checked style="width:18px; height:18px;"> Cash
                        </label>
                        <label style="display:flex; align-items:center; gap:8px; font-weight:normal; cursor:pointer;">
                            <input type="radio" name="payment_method" value="bank" style="width:18px; height:18px;"> Bank Transfer
                        </label>
                    </div>
                </div>

                <div id="modal-bank-selector" style="display:none;">
                    <div class="form-group">
                        <label>Company Bank Account</label>
                        <select name="bank_account_id" class="form-control">
                            <option value="">Select Account</option>
                            ${bankOptions}
                        </select>
                    </div>
                    ${type === 'expense' ? `
                        <div style="padding:10px; border:1px solid var(--border-color); border-radius:8px; margin-top:10px;">
                            <label style="font-size:0.8rem; color:var(--text-muted);">BENEFICIARY DETAILS (EXTERNAL)</label>
                            <div class="form-group" style="margin-top:10px;">
                                <input name="external_bank_name" placeholder="Beneficiary Bank" class="form-control" style="margin-bottom:10px;">
                                <input name="external_account_number" placeholder="Account Number" class="form-control">
                            </div>
                        </div>
                    ` : ''}
                </div>

                <button type="submit" class="btn-success full-width mt-3" style="padding:12px;">Confirm & Record Transaction</button>
            </form>
        `;

        modal.classList.remove('hidden');

        const pform = document.getElementById('payment-finalize-form');
        const bankSelector = document.getElementById('modal-bank-selector');
        
        pform.querySelectorAll('input[name="payment_method"]').forEach(radio => {
            radio.addEventListener('change', () => {
                bankSelector.style.display = radio.value === 'bank' ? 'block' : 'none';
                const bankSelect = pform.querySelector('select[name="bank_account_id"]');
                if(radio.value === 'bank') bankSelect.setAttribute('required', 'true');
                else bankSelect.removeAttribute('required');
            });
        });

        pform.onsubmit = async (e) => {
            e.preventDefault();
            const pfd = new FormData(pform);
            const descId = type === 'expense' ? 'exp-desc' : 'inc-desc';
            const amtId = type === 'expense' ? 'exp-amount' : 'inc-amount';
            const dateId = type === 'expense' ? 'exp-date' : 'inc-date';
            const siteId = type === 'expense' ? 'exp-site' : 'inc-site';

            const data = {
                site: document.getElementById(siteId).value,
                description: document.getElementById(descId).value,
                amount: parseFloat(document.getElementById(amtId).value),
                date: document.getElementById(dateId).value,
                payment_method: pfd.get('payment_method'),
                bank_account_id: pfd.get('bank_account_id'),
                external_bank_name: pfd.get('external_bank_name'),
                external_account_number: pfd.get('external_account_number'),
                type: type
            };

            const newTx = await this.saveTransaction(key, data);
            
            modal.classList.add('hidden');

            if(confirm('Transaction Recorded! Print Receipt?')) {
                this.printReceipt(newTx);
            }

            activeForm.reset();
            const today = new Date().toISOString().split('T')[0];
            const dateEl = document.getElementById(dateId);
            if (dateEl) dateEl.value = today;
            this.populateSiteSelects();
        };
    }

    async saveTransaction(key, data) {
        data.date = new Date(data.date).toISOString();
        const newItem = await window.Store.add(key, data);
        
        await window.Store.addActivityLog({
            action_type: 'ADD',
            module_name: 'Construction',
            details: `${data.type.toUpperCase()} recorded for ${data.site}: ${data.amount}`
        });

        this.updateStats();
        return newItem;
    }

    printReceipt(tx) {
        const win = window.open('', '', 'width=400,height=600');
        win.document.write(`
            <html>
                <style>
                    body { font-family: monospace; padding: 20px; }
                    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 0.8em; }
                </style>
                <body>
                    <div class="header">
                        <h2>Construction Receipt</h2>
                        <p>Ref: ${tx.id}</p>
                    </div>
                    <div class="row"><span>Date:</span><span>${new Date(tx.date).toLocaleDateString()}</span></div>
                    <div class="row"><span>Site:</span><span>${tx.site}</span></div>
                    <div class="row"><span>Desc:</span><span>${tx.description}</span></div>
                    <div class="row"><span>Amount:</span><span>$${tx.amount.toFixed(2)}</span></div>
                    <hr>
                    <div class="row"><span>Method:</span><span>${tx.payment_method.toUpperCase()}</span></div>
                    ${tx.external_bank_name ? `<div class="row"><span>To Bank:</span><span>${tx.external_bank_name}</span></div>` : ''}
                    <div class="footer">Thank you!</div>
                </body>
            </html>
        `);
        win.document.close();
        setTimeout(() => {
            win.focus();
            win.print();
            win.close();
        }, 500);
    }

    // --- Records ---
    async renderRecords() {
        const expenses = (await window.Store.get(this.expKey) || []).map(i => ({ ...i, cat: 'expense' }));
        const incomes = (await window.Store.get(this.incKey) || []).map(i => ({ ...i, cat: 'income' }));
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
