/**
 * Construction Module Script
 */
class ConstructionModule {
    constructor() {
        this.expenseKey = 'construction_expenses';
        this.incomeKey = 'construction_income';
    }

    async initDashboard() {
        const expenses = await window.Store.get(this.expenseKey) || [];
        const incomes = await window.Store.get(this.incomeKey) || [];
        const totExp = expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
        const totInc = incomes.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

        document.getElementById('cons-dash-expense').textContent = totExp.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
        document.getElementById('cons-dash-income').textContent = totInc.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
        document.getElementById('cons-dash-balance').textContent = (totInc - totExp).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

        // Project breakdown
        const projectStats = {};
        expenses.forEach(exp => {
            const proj = exp.project || 'Unassigned';
            if (!projectStats[proj]) projectStats[proj] = { exp: 0, inc: 0 };
            projectStats[proj].exp += (parseFloat(exp.amount) || 0);
        });
        incomes.forEach(inc => {
            const proj = inc.project || 'Unassigned';
            if (!projectStats[proj]) projectStats[proj] = { exp: 0, inc: 0 };
            projectStats[proj].inc += (parseFloat(inc.amount) || 0);
        });

        const breakdownDiv = document.getElementById('projects-breakdown');
        breakdownDiv.innerHTML = '';
        Object.keys(projectStats).forEach(proj => {
            const stats = projectStats[proj];
            const balance = stats.inc - stats.exp;
            const balanceColor = balance >= 0 ? 'green' : 'red';
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;';
            div.innerHTML = `
                <strong>${proj}</strong>
                <div style="display: flex; gap: 20px;">
                    <span>Income: <span style="color: green;">$${stats.inc.toFixed(2)}</span></span>
                    <span>Expenses: <span style="color: red;">$${stats.exp.toFixed(2)}</span></span>
                    <span>Balance: <span style="color: ${balanceColor};">$${balance.toFixed(2)}</span></span>
                </div>
            `;
            breakdownDiv.appendChild(div);
        });
    }

    initForm(type) {
        const form = document.querySelector('form');
        
        // Restrict date to today only
        const dateInput = form.querySelector('input[name="date"]');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.min = today;
            dateInput.max = today;
            dateInput.value = today;
        }
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.showPaymentModal(type, form);
        });
    }

    async showPaymentModal(type, activeForm) {
        const modal = document.getElementById('modal-container');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        const fd = new FormData(activeForm);
        const amount = parseFloat(fd.get('amount') || 0);
        const project = fd.get('project') || 'N/A';

        title.textContent = 'Finalize Payment';
        
        const allBanks = await window.Store.get('bank_accounts') || [];
        const consBanks = allBanks.filter(b => !b.sectors || b.sectors.includes('construction') || b.sectors === 'all');
        const bankOptions = consBanks.map(b => `<option value="${b.id}">${b.bank_name} - ${b.account_number}</option>`).join('');

        body.innerHTML = `
            <div style="margin-bottom:20px; padding:15px; background:var(--bg-input); border-radius:8px; text-align:center;">
                <div style="font-size:0.9rem; color:var(--text-muted); text-transform:uppercase;">Total Amount to ${type === 'expense' ? 'PAY' : 'RECEIVE'}</div>
                <div style="font-size:2rem; font-weight:800; color:var(--text-main);">${amount.toFixed(2)} <span style="font-size:1rem; font-weight:400;">ETB</span></div>
                <div style="font-size:0.9rem; margin-top:5px;">Project: ${project}</div>
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
            const bankId = pfd.get('bank_account_id');
            let bankName = '';
            if (bankId) {
                const b = allBanks.find(x => x.id == bankId);
                if (b) bankName = b.bank_name;
            }

            const data = {
                description: activeForm.desc.value,
                project: activeForm.project.value,
                amount: parseFloat(activeForm.amount.value),
                date: new Date(activeForm.date.value).toISOString(),
                type: type,
                payment_method: pfd.get('payment_method'),
                bank_account_id: bankId,
                bank_name: bankName,
                external_bank_name: (type === 'expense') ? pfd.get('external_bank_name') : null,
                external_account_number: (type === 'expense') ? pfd.get('external_account_number') : null
            };

            const key = type === 'expense' ? this.expenseKey : this.incomeKey;
            const saved = await window.Store.add(key, data);

            await window.Store.addActivityLog({
                action_type: 'ADD',
                module_name: 'Construction',
                details: `${type.toUpperCase()} recorded for ${data.project || 'Site'}: ${data.amount}`
            });

            modal.classList.add('hidden');

            if(confirm('Transaction Recorded! Print Receipt?')) {
                this.printReceipt(saved);
            }

            activeForm.reset();
        };
    }

    printReceipt(tx) {
        const win = window.open('', '', 'width=400,height=600');
        win.document.write(`
            <html>
            <head>
                <title>Construction Receipt</title>
                <style>
                    body { font-family: monospace; padding: 20px; }
                    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 0.8em; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h3>UniManage Construction</h3>
                    <p>Date: ${new Date(tx.date).toLocaleDateString()}</p>
                    <p>Ref: ${tx.id}</p>
                </div>
                <div class="row"><span>Type:</span><span>${tx.type.toUpperCase()}</span></div>
                <div class="row"><span>Project:</span><span>${tx.project || 'N/A'}</span></div>
                <div class="row"><span>Description:</span><span>${tx.description}</span></div>
                <hr>
                <div class="row" style="font-weight:bold"><span>Amount:</span><span>$${tx.amount.toFixed(2)}</span></div>
                <hr>
                <div class="row"><span>Payment:</span><span>${tx.payment_method.toUpperCase()}</span></div>
                ${tx.bank_name ? `<div class="row"><span>Company Bank:</span><span>${tx.bank_name}</span></div>` : ''}
                ${tx.external_bank_name ? `<div class="row"><span>Ext Bank:</span><span>${tx.external_bank_name}</span></div>` : ''}
                ${tx.external_account_number ? `<div class="row"><span>Ext Acc No:</span><span>${tx.external_account_number}</span></div>` : ''}
                <div class="footer">Thank you!</div>
            </body>
            </html>
        `);
        win.document.close();
        win.print();
    }

    async initRecords() {
        const expenses = (await window.Store.get(this.expenseKey) || []).map(i => ({ ...i, cat: 'expense' }));
        const incomes = (await window.Store.get(this.incomeKey) || []).map(i => ({ ...i, cat: 'income' }));
        const all = [...expenses, ...incomes];
        all.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Get unique projects
        const projects = [...new Set(all.map(tx => tx.project).filter(p => p))];
        const select = document.getElementById('project-select');
        select.innerHTML = '<option value="">Select a Project</option>';
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            option.textContent = project;
            select.appendChild(option);
        });

        // Function to render records
        const renderRecords = (selectedProject) => {
            const tbody = document.querySelector('tbody');
            tbody.innerHTML = '';
            const filtered = selectedProject ? all.filter(tx => tx.project === selectedProject) : [];
            filtered.forEach(tx => {
                const color = tx.cat === 'income' ? 'green' : 'red';
                const amt = parseFloat(tx.amount) || 0;
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${new Date(tx.date).toLocaleDateString()}</td><td><span style="color:${color};font-weight:bold">${tx.cat.toUpperCase()}</span></td><td>${tx.project || 'N/A'}</td><td>${tx.description}</td><td style="color:${color}">${tx.cat === 'income' ? '+' : '-'}${amt.toFixed(2)}</td>`;
                tbody.appendChild(tr);
            });
        };

        // Initially show no records
        renderRecords('');

        // Add event listener
        select.addEventListener('change', (e) => {
            renderRecords(e.target.value);
        });
    }
}
window.ConstructionModule = new ConstructionModule();
