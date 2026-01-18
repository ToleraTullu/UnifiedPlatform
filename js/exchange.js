/**
 * Exchange.js V2
 * Money Exchange Module with Multi-View Support
 */

class ExchangeModule {
    constructor() {
        this.txKey = 'exchange_transactions';
        this.ratesKey = 'exchange_rates';
        this.initListeners();
    }

    initListeners() {
        document.addEventListener('click', (e) => {
            // Nav Buttons (handled by App usually, but if specific logic needed...)
            // Actually App handles navigation. We handle FUNCTION settings.
            
            // Dashboard IDs
            if(e.target.id === 'btn-nav-ex-buy') window.App.navigateTo('exchange-buy');
            if(e.target.id === 'btn-nav-ex-sell') window.App.navigateTo('exchange-sell');
            if(e.target.id === 'btn-nav-ex-holdings') window.App.navigateTo('exchange-holdings');

            // Forms
            if(e.target.id === 'btn-record-buy') this.recordTransaction('buy');
            if(e.target.id === 'btn-record-sell') this.recordTransaction('sell');
            if(e.target.id === 'btn-save-rates') this.saveRates();
            if(e.target.id === 'btn-update-rates') this.showRatesForm(); // Helper if needed
        });
        
        // Removed broken global listeners for calculation; renderForm handles this locally.
    }

    async init() {
         // Async Init usually called by App on View Load
         await this.updateStats();
    }

    onViewLoad(action) {
        // Called by App.js when navigating to exchange-[action]
        switch (action) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'buy':
                this.renderForm('buy');
                break;
            case 'sell':
                this.renderForm('sell');
                break;
            case 'records':
                this.renderRecords();
                break;
            case 'holdings':
                this.renderHoldings();
                break;
            case 'rates':
                this.renderRatesEditor();
                break;
        }
    }

    // --- Data Helpers ---
    async calculateHoldings() {
        const txs = await window.Store.get(this.txKey) || [];
        // Initial Vault (Seed)
        const vault = {
            USD: 10000,
            EUR: 5000,
            GBP: 5000,
            LOCAL: 500000 
        };

        txs.forEach(tx => {
            const amt = parseFloat(tx.amount || 0);
            const rate = parseFloat(tx.rate || 0);
            const total = parseFloat(tx.total || (amt * rate));
            const code = (tx.currency_code || tx.currency || '').toUpperCase();

            if (!code) return; // Skip invalid tx

            const type = (tx.type || '').toLowerCase();

            if (type === 'buy') {
                if (vault[code] === undefined) vault[code] = 0;
                vault[code] += amt;
                vault.LOCAL -= total;
            } else if (type === 'sell') {
                if (vault[code] === undefined) vault[code] = 0;
                vault[code] -= amt;
                vault.LOCAL += total;
            }
        });
        return vault;
    }

    async getCurrencies() {
        const data = await window.Store.get(this.ratesKey);
        // Fallback for defaults if empty
        if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0)) {
            return [
                { code: 'USD', buy: 1.0, sell: 1.02 },
                { code: 'EUR', buy: 0.9, sell: 0.92 },
                { code: 'GBP', buy: 0.8, sell: 0.82 }
            ];
        }
        
        if (Array.isArray(data)) return data;
        
        // Convert Object to Array
        return Object.entries(data).map(([code, rateData]) => ({
            code: code,
            buy: rateData.buy_rate || rateData.buy || rateData.rate || 1,
            sell: rateData.sell_rate || rateData.sell || rateData.rate || 1
        }));
    }

    async setCurrencies(list) {
        // Convert Array back to Object for storage
        const ratesObj = {};
        list.forEach(c => {
            ratesObj[c.code] = {
                buy_rate: c.buy,
                sell_rate: c.sell,
                updated: new Date().toISOString()
            };
        });
        await window.Store.set(this.ratesKey, ratesObj);
    }

    // --- Dashboard ---
    renderDashboard() {
        const currencies = this.getCurrencies(); // Note: this is async but we don't await here, updateStats is async
        this.updateStats();
    }

    async updateStats() {
        // Show loader on stats cards if empty? 
        // Better to just let them update naturally. 
        // But for "Global" stat which might take time:
        // UI.showLoader('#stat-exchange'); // Example usage if needed, but text replacement is usually instant here.
        
        const transactions = await window.Store.get(this.txKey) || [];

        // Calculate totals by type and currency
        const stats = {
            buy: { USD: 0, EUR: 0, GBP: 0 },
            sell: { USD: 0, EUR: 0, GBP: 0 }
        };

        let totalVol = 0;

        transactions.forEach(tx => {
            const amt = parseFloat(tx.amount) || 0;
            const rate = parseFloat(tx.rate) || 0;
            const code = tx.currency_code; // Correct field name

            if (stats[tx.type] && stats[tx.type][code] !== undefined) {
                stats[tx.type][code] += amt;
            }
            // Volume is the local cash equivalent moved
            totalVol += (amt * rate);
        });

        // Update Module Dashboard DOM
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val.toLocaleString(undefined, { minimumFractionDigits: 2 });
        };

        Object.keys(stats.buy).forEach(code => {
            setTxt(`ex-buy-${code.toLowerCase()}`, stats.buy[code]);
            setTxt(`ex-sell-${code.toLowerCase()}`, stats.sell[code]);
        });

        // Update Global Stat
        const globalEl = document.getElementById('stat-exchange');
        if (globalEl) globalEl.textContent = totalVol.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    }

    // --- Forms ---
    async renderForm(type) {
        const container = document.getElementById(`exchange-${type}-form`);
        if (!container) return;

        // Fetch currencies and rates from Store (assuming they are stored separately now)
        // The existing getCurrencies() returns an array of {code, buy, sell}.
        // We need to adapt this to the new structure expected by the snippet.
        const currentRatesArray = await this.getCurrencies(); // This returns [{code, buy, sell}]
        const currencies = currentRatesArray.map(c => ({ code: c.code, name: c.code })); // Create {code, name} for options
        const rates = {};
        currentRatesArray.forEach(c => {
            rates[c.code] = { buy: c.buy, sell: c.sell };
        });
        
        const currencyOptions = currencies.map(c => `<option value="${c.code}">${c.name} (${c.code})</option>`).join('');

        // Form Structure (No payment fields here anymore)
        const formHtml = `
            <form id="transaction-form" data-type="${type}">
                <div class="form-group">
                    <label>Customer Full Name</label>
                    <input type="text" name="customer" required placeholder="Full Name" class="form-control">
                </div>
                <div class="form-group">
                    <label>Customer ID / Passport</label>
                    <input type="text" name="cid" required placeholder="ID Number" class="form-control">
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Currency</label>
                            <select name="currency_code" id="ex-${type}-currency" class="form-control" required>
                                <option value="">Select Currency</option>
                                ${currencyOptions}
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Amount</label>
                            <input type="number" name="amount" id="ex-${type}-amt" class="form-control" step="0.01" required placeholder="0.00">
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Exchange Rate</label>
                            <input type="number" name="rate" class="form-control" step="0.0001" required placeholder="0.0000">
                            <small class="text-muted" id="suggested-rate"></small>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Total (Local)</label>
                            <input type="text" id="total-val" class="form-control" readonly placeholder="Calculated automatically">
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Description / Notes</label>
                    <textarea name="description" class="form-control" rows="2" placeholder="Optional details..."></textarea>
                </div>

                <button type="submit" class="btn-primary full-width mt-3">
                    ${type === 'buy' ? 'Record Purchase' : 'Record Sale'}
                </button>
            </form>
        `;

        if (container.tagName === 'FORM') {
            container.innerHTML = formHtml.replace('<form id="transaction-form" data-type="${type}">', '').replace('</form>', '');
            this.activeForm = container;
        } else {
            container.innerHTML = formHtml;
            this.activeForm = document.getElementById('transaction-form');
        }

        // Auto-rate retrieval
        const currencySelect = this.activeForm.querySelector('[name="currency_code"]');
        const rateInput = this.activeForm.querySelector('[name="rate"]');
        const amountInput = this.activeForm.querySelector('[name="amount"]');
        const totalDisplay = document.getElementById('total-val');

        currencySelect.addEventListener('change', async () => {
            const code = currencySelect.value;
            if (code && rates[code]) {
                const suggested = type === 'buy' ? rates[code].buy : rates[code].sell;
                rateInput.value = suggested;
                document.getElementById('suggested-rate').textContent = `Suggested: ${suggested}`;
                
                if (type === 'sell') {
                    const vault = await this.calculateHoldings();
                    const available = vault[code] || 0;
                    document.getElementById('suggested-rate').innerHTML += ` | <span style="color:var(--primary)">Max Available: ${available.toLocaleString(undefined, {minimumFractionDigits:2})}</span>`;
                    amountInput.max = available;
                } else if (type === 'buy') {
                    const vault = await this.calculateHoldings();
                    document.getElementById('suggested-rate').innerHTML += ` | <span style="color:var(--primary)">Local Cash: ${vault.LOCAL.toLocaleString(undefined, {minimumFractionDigits:2})}</span>`;
                }
                
                calculateTotal();
            } else {
                rateInput.value = '';
                document.getElementById('suggested-rate').textContent = '';
                calculateTotal();
            }
        });

        const calculateTotal = () => {
            const amt = parseFloat(amountInput.value) || 0;
            const rate = parseFloat(rateInput.value) || 0;
            totalDisplay.value = (amt * rate).toFixed(2);
        };

        amountInput.addEventListener('input', calculateTotal);
        // Add change listener as well for robustness
        amountInput.addEventListener('change', calculateTotal);
        rateInput.addEventListener('input', calculateTotal);
        rateInput.addEventListener('change', calculateTotal);

        this.activeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.showPaymentModal(type);
        });
    }

    initForms() {
        // Can pre-render or wait for init
    }

    async showPaymentModal(type) {
        const modal = document.getElementById('modal-container');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        const fd = new FormData(this.activeForm);
        const amt = parseFloat(fd.get('amount'));
        const rate = parseFloat(fd.get('rate'));
        const total = (amt * rate).toFixed(2);
        const currency = fd.get('currency_code');

        title.textContent = 'Finalize Payment';
        
        // Fetch eligible banks
        const allBanks = await window.Store.get('bank_accounts') || [];
        const sectorBanks = Array.isArray(allBanks) ? allBanks.filter(b => !b.sectors || b.sectors.includes('exchange') || b.sectors === 'all') : [];
        const bankOptions = sectorBanks.map(b => `<option value="${b.id}">${b.bank_name} - ${b.account_number}</option>`).join('');

        body.innerHTML = `
            <div style="margin-bottom:20px; padding:15px; background:var(--bg-input); border-radius:8px; text-align:center;">
                <div style="font-size:0.9rem; color:var(--text-muted); text-transform:uppercase;">Total Amount to ${type === 'buy' ? 'PAY' : 'RECEIVE'}</div>
                <div style="font-size:2rem; font-weight:800; color:var(--text-main);">${total} <span style="font-size:1rem; font-weight:400;">ETB</span></div>
                <div style="font-size:0.9rem; margin-top:5px;">(${amt} ${currency} @ ${rate})</div>
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
                    ${type === 'buy' ? `
                        <div style="padding:10px; border:1px solid var(--border-color); border-radius:8px; margin-top:10px;">
                            <label style="font-size:0.8rem; color:var(--text-muted);">BENEFICIARY DETAILS (EXTERNAL)</label>
                            <div class="form-group" style="margin-top:10px;">
                                <input name="external_bank_name" placeholder="Beneficiary Bank name" class="form-control" style="margin-bottom:10px;">
                                <input name="external_account_number" placeholder="Beneficiary Account Number" class="form-control">
                            </div>
                        </div>
                    ` : ''}
                </div>

                <button type="submit" class="btn-success full-width mt-3" style="padding:12px;">Confirm & Record Transaction</button>
            </form>
        `;

        modal.classList.remove('hidden');

        // Toggle bank fields
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

        pform.onsubmit = (e) => {
            e.preventDefault();
            const pfd = new FormData(pform);
            this.recordTransaction(type, pfd);
        };
    }

    async recordTransaction(type, paymentData) {
        const fd = new FormData(this.activeForm);
        const submitBtn = this.activeForm.querySelector('button[type="submit"]');
        
        const amount = parseFloat(fd.get('amount'));
        const code = (fd.get('currency_code') || '').toUpperCase();
        const rate = parseFloat(fd.get('rate'));
        const total = (amount * rate);

        if (isNaN(amount) || isNaN(rate) || !code) {
            UI.error('Invalid transaction data. Please check inputs.');
            return;
        }

        // Disable button to prevent double-click
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
        }

        try {
            // Safety Check for Selling
            const vault = await this.calculateHoldings();
            if (type === 'sell') {
                if (vault[code] === undefined || vault[code] < amount) {
                    UI.error(`Insufficient Holdings! You only have ${vault[code] !== undefined ? vault[code].toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'} ${code} available.`);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Record Sale';
                    }
                    return;
                }
            } else if (type === 'buy') {
                if (vault.LOCAL < total) {
                    UI.error(`Insufficient Local Cash! You only have ${vault.LOCAL.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB available to buy ${code}.`);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Record Purchase';
                    }
                    return;
                }
            }

            const transaction = {
                id: Date.now(),
                date: new Date().toISOString(),
                type: type,
                customer_name: fd.get('customer'),
                customer_id: fd.get('cid'),
                currency_code: code,
                amount: amount,
                rate: rate,
                total_local: total.toFixed(2), 
                description: fd.get('description'),
                payment_method: paymentData.get('payment_method'),
                bank_account_id: paymentData.get('bank_account_id'),
                external_bank_name: paymentData.get('external_bank_name'),
                external_account_number: paymentData.get('external_account_number'),
                status: 'completed'
            };

            await window.Store.add(this.txKey, transaction);
            
            // Log activity
            await window.Store.addActivityLog({
                action_type: 'ADD',
                module_name: 'Exchange',
                details: `${type.toUpperCase()} ${transaction.amount} ${transaction.currency_code}`
            });

            // Hide modal
            document.getElementById('modal-container').classList.add('hidden');

            if (confirm('Transaction Recorded! Print Receipt?')) {
                this.printReceipt(transaction);
            }

            // Navigate back or reload
            if (window.App && typeof window.App.navigateTo === 'function') {
                window.App.navigateTo('exchange-dashboard');
            } else {
                window.location.href = '../../dashboard.html#exchange';
            }
            UI.success('Transaction Recorded Successfully!');
        } catch (err) {
            console.error('Transaction failed:', err);
            UI.error('An error occurred while recording the transaction.');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = type === 'buy' ? 'Record Purchase' : 'Record Sale';
            }
        }
    }

    printReceipt(tx) {
        const win = window.open('', '', 'width=400,height=600');
        win.document.write(`
            <html>
            <head>
                <title>Receipt</title>
                <style>
                    body { font-family: monospace; padding: 20px; }
                    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 0.8em; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h3>UniManage Exchange</h3>
                    <p>Date: ${new Date(tx.date).toLocaleString()}</p>
                    <p>Ref: ${tx.id}</p>
                </div>
                <div class="row"><span>Type:</span><span>${tx.type.toUpperCase()}</span></div>
                <div class="row"><span>Customer:</span><span>${tx.customer}</span></div>
                <div class="row"><span>ID/Passport:</span><span>${tx.cid || '-'}</span></div>
                <div class="row"><span>Currency:</span><span>${tx.currency_code}</span></div>
                <div class="row"><span>Rate:</span><span>${tx.rate}</span></div>
                <div class="row"><span>Amount:</span><span>${parseFloat(tx.amount).toFixed(2)}</span></div>
                <hr>
                <div class="row" style="font-weight:bold"><span>Total:</span><span>${parseFloat(tx.total).toFixed(2)}</span></div>
                <hr>
                <div class="row"><span>Payment:</span><span>${tx.payment_method.toUpperCase()}</span></div>
                ${tx.payment_method === 'bank' ? `<div class="row"><span>Bank:</span><span>${tx.bank_name || 'N/A'}</span></div>` : ''}
                ${tx.external_bank_name ? `<div class="row"><span>Ext Bank:</span><span>${tx.external_bank_name}</span></div>` : ''}
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

    // --- Holdings ---

    async renderHoldings() {
        const vault = await this.calculateHoldings();

        document.getElementById('ex-holdings-usd').textContent = vault.USD.toLocaleString(undefined, { minimumFractionDigits: 2 });
        document.getElementById('ex-holdings-eur').textContent = vault.EUR.toLocaleString(undefined, { minimumFractionDigits: 2 });
        document.getElementById('ex-holdings-gbp').textContent = vault.GBP.toLocaleString(undefined, { minimumFractionDigits: 2 });
        document.getElementById('ex-holdings-local').textContent = vault.LOCAL.toLocaleString(undefined, { minimumFractionDigits: 2 });
    }

    // --- Admin Rates (Dynamic) ---
    async renderRatesEditor() {
        const currencies = await this.getCurrencies();
        const container = document.getElementById('exchange-rates-form');

        let rows = currencies.map((c, idx) => `
            <tr>
                <td><input type="text" value="${c.code}" disabled class="form-control" style="width:80px"></td>
                <td><input type="number" step="0.0001" value="${c.buy}" id="buy-${idx}" class="form-control"></td>
                <td><input type="number" step="0.0001" value="${c.sell}" id="sell-${idx}" class="form-control"></td>
                <td><button type="button" class="btn-danger btn-delete-currency" data-idx="${idx}" style="padding:5px 10px">×</button></td>
            </tr>
        `).join('');

        container.innerHTML = `
            <h3>Manage Currencies</h3>
            <table class="data-table" style="margin-bottom:1rem">
                <thead><tr><th>Code</th><th>Buy Rate</th><th>Sell Rate</th><th>Action</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            
            <hr>
            <h4>Add New Currency</h4>
            <div style="display:flex; gap:10px; margin-bottom:1rem;">
                <input type="text" id="new-code" placeholder="Code (e.g. JPY)" class="form-control">
                <input type="number" id="new-buy" placeholder="Buy Rate" class="form-control" step="0.0001">
                <input type="number" id="new-sell" placeholder="Sell Rate" class="form-control" step="0.0001">
                <button type="button" class="btn-success" id="btn-add-currency">Add</button>
            </div>

            <button type="button" class="btn-primary" id="btn-save-rates">Save All Changes</button>
        `;

        // Attach Listeners for this specific view render? 
        // Or rely on global listener? Global listener covers IDs that are static-like.
        // But dynamic table rows (delete) are harder with global simple ID checks.
        // Let's add specific listeners here for the static buttons we just rendered.
        
        const btnAdd = document.getElementById('btn-add-currency');
        if(btnAdd) btnAdd.onclick = () => this.addCurrency();

        // Save Rate is handled by Global Listener 'btn-save-rates'
        
        // Dynamic Delete Buttons
        const deletes = container.querySelectorAll('.btn-delete-currency');
        deletes.forEach(btn => {
             btn.onclick = (e) => this.deleteCurrency(e.target.dataset.idx);
        });
    }

    async addCurrency() {
        const code = document.getElementById('new-code').value.toUpperCase();
        const buy = parseFloat(document.getElementById('new-buy').value);
        const sell = parseFloat(document.getElementById('new-sell').value);
        if (!code || isNaN(buy) || isNaN(sell)) return UI.error('Invalid Input');

        const list = await this.getCurrencies();
        list.push({ code, buy, sell });
        await this.setCurrencies(list);
        this.renderRatesEditor();
    }

    async deleteCurrency(index) {
        if(!confirm('Are you sure you want to delete this currency?')) return;
        const list = await this.getCurrencies();
        list.splice(index, 1);
        await this.setCurrencies(list);
        this.renderRatesEditor();
    }

    async saveRates() {
        // Collect from Inputs
        const list = await this.getCurrencies(); // Get current structure
        // We only edited rates in the table, assuming order matches
        // Actually better to rebuild from DOM in case sort changed? No, simplistic approach:
        const inputs = document.querySelectorAll('#exchange-rates-form tbody tr');
        let newList = [];
        inputs.forEach((row, idx) => {
            const code = list[idx].code; // Use existing code or read from disabled input
            const buy = parseFloat(document.getElementById(`buy-${idx}`).value);
            const sell = parseFloat(document.getElementById(`sell-${idx}`).value);
            newList.push({ code, buy, sell });
        });

        await this.setCurrencies(newList);
        UI.success('Rates Saved!');
    }

    // --- Records ---
    async renderRecords() {
        const container = document.querySelector('#view-exchange-records .card'); 
        UI.showLoader(container);

        const transactions = await window.Store.get(this.txKey) || [];
        const bankAccounts = await window.Store.get('bank_accounts') || [];
        const tbody = document.getElementById('exchange-records-body');
        tbody.innerHTML = '';
        
        const isAdmin = window.Auth && window.Auth.currentUser && window.Auth.currentUser.role === 'admin';
        
        // Update header: Ensure 'Details' column is first
        const theadRow = document.querySelector('#view-exchange-records thead tr');
        if (theadRow) {
            // Check if we already have the details header
            if (!theadRow.querySelector('.th-details')) {
                const th = document.createElement('th');
                th.className = 'th-details';
                th.style.width = '40px';
                th.textContent = '';
                theadRow.insertBefore(th, theadRow.firstChild);
            }
            
            // Layout fix: Expand Actions check (existing logic preserved)
            if (isAdmin && !theadRow.querySelector('.th-action')) {
                const th = document.createElement('th');
                th.className = 'th-action';
                th.textContent = 'Actions';
                theadRow.appendChild(th);
            }
        }

        // Sort by date desc
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        transactions.forEach(tx => {
            // FIX: Use customer_name or fallback to customer
            const customerName = tx.customer_name || tx.customer || 'Unidentified';

            // MAIN ROW
            const tr = document.createElement('tr');
            
            // Initial render of Main Row
            tr.innerHTML = `
                <td>
                    <button class="btn-primary btn-sm btn-toggle-details" style="border-radius:50%; width:24px; height:24px; padding:0; display:flex; align-items:center; justify-content:center; font-weight:bold;">+</button>
                </td>
                <td>${new Date(tx.date).toLocaleString()}</td>
                <td><span style="font-weight:bold; color:${tx.type === 'buy' ? 'green' : 'red'}">${tx.type.toUpperCase()}</span></td>
                <td>${customerName}</td>
                <td>${tx.currency_code}</td>
                <td>${parseFloat(tx.amount).toFixed(2)}</td>
                <td>${parseFloat(tx.rate).toFixed(4)}</td>
                <td>${(parseFloat(tx.amount) * parseFloat(tx.rate)).toFixed(2)}</td>
                ${isAdmin ? `<td><button class="btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="window.ExchangeModule.deleteTransaction(${tx.id})">Delete</button></td>` : ''}
            `;
            tbody.appendChild(tr);

            // DETAIL ROW (Hidden by default)
            const trDetail = document.createElement('tr');
            trDetail.style.display = 'none';
            trDetail.style.backgroundColor = 'var(--bg-body)'; // Slightly different bg
            
            // Payment Details Logic
            let paymentInfo = `<span style="text-transform:capitalize">${tx.payment_method}</span>`;
            if (tx.payment_method === 'bank') {
                const bank = bankAccounts.find(b => b.id == tx.bank_account_id);
                paymentInfo += ` <span style="color:var(--text-muted)">via</span> ${bank ? `${bank.bank_name} (${bank.account_number})` : 'Unknown Bank'}`;
            }
            if (tx.external_bank_name) {
                paymentInfo += `<br><small>Beneficiary: ${tx.external_bank_name} - ${tx.external_account_number || ''}</small>`;
            }

            trDetail.innerHTML = `
                <td colspan="${isAdmin ? 9 : 8}" style="padding:15px 20px;">
                    <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:20px;">
                        <div><strong>Full Name:</strong> ${customerName}</div>
                        <div><strong>ID Number:</strong> ${tx.cid || tx.customer_id || 'N/A'}</div>
                        <div><strong>Payment Method:</strong> ${paymentInfo}</div>
                        ${tx.description ? `<div><strong>Notes:</strong> ${tx.description}</div>` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(trDetail);

            // Toggle Logic
            const btn = tr.querySelector('.btn-toggle-details');
            btn.addEventListener('click', () => {
                const isHidden = trDetail.style.display === 'none';
                trDetail.style.display = isHidden ? 'table-row' : 'none';
                btn.textContent = isHidden ? '-' : '+';
                btn.classList.toggle('btn-primary', !isHidden); // Optional style toggle
                btn.classList.toggle('btn-secondary', isHidden);
            });
        });
        
        UI.hideLoader(container);
    }
    
    async deleteTransaction(id) {
        if (!confirm('Are you sure you want to delete this transaction? This will affect your holdings.')) return;
        
        const success = await window.Store.remove(this.txKey, id);
        if (success) {
            UI.success('Transaction deleted.');
            this.renderRecords();
            this.updateStats(); // Refresh stats/holdings
        } else {
            UI.error('Failed to delete transaction.');
        }
    }
}

window.ExchangeModule = new ExchangeModule();
