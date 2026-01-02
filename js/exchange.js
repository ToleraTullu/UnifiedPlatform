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
        
        // Dynamic Change Listeners for Rate Calculation
        document.addEventListener('change', (e) => {
            if(e.target.id === 'ex-buy-currency') this.updateRateDisplay('buy');
            if(e.target.id === 'ex-sell-currency') this.updateRateDisplay('sell');
            // Amount calc
            if(e.target.id === 'ex-buy-amt') this.calculateTotal('buy');
            if(e.target.id === 'ex-sell-amt') this.calculateTotal('sell');
        });
        
        document.addEventListener('input', (e) => {
             if(e.target.id === 'ex-buy-amt') this.calculateTotal('buy');
             if(e.target.id === 'ex-sell-amt') this.calculateTotal('sell');
        });
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
        const currencies = this.getCurrencies();
        this.updateStats();
    }

    async updateStats() {
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

            if (stats[tx.type] && stats[tx.type][tx.currency] !== undefined) {
                stats[tx.type][tx.currency] += amt;
            }
            totalVol += (amt * rate);
        });

        // Update Module Dashboard DOM
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val.toLocaleString();
        };

        // This is now hardcoded in HTML for USD/EUR/GBP only, which is fine for the 4-col layout
        // Or we could make the dashboard grid dynamic?
        // Let's keep existing logic but being aware stats might be 0 if currency deleted
        // Note: The user might want to see TOP currencies logic later, for now we stick to fixed or dynamic?
        // Based on user request "show top buy and sales daily and weekly", we'll improve that later.

        // Populate standard placeholders if they exist
        if (stats.buy.USD) setTxt('ex-buy-usd', stats.buy.USD.toFixed(2));
        if (stats.sell.USD) setTxt('ex-sell-usd', stats.sell.USD.toFixed(2));
        if (stats.buy.EUR) setTxt('ex-buy-eur', stats.buy.EUR.toFixed(2));
        if (stats.sell.EUR) setTxt('ex-sell-eur', stats.sell.EUR.toFixed(2));

        // Update Global Stat
        const globalEl = document.getElementById('stat-exchange');
        if (globalEl) globalEl.textContent = totalVol.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    }

    // --- Forms ---
    async renderForm(type) {
        // type = 'buy' or 'sell'
        const formId = `exchange-${type}-form`;
        const container = document.getElementById(formId);

        // Always re-render to capture new currencies
        const currencies = await this.getCurrencies();
        let options = currencies.map(c => `<option value="${c.code}">${c.code}</option>`).join('');

        container.innerHTML = `
            <div class="form-group">
                <label>Customer Full Name</label>
                <input type="text" name="customer" required placeholder="Full Name">
            </div>
            <div class="form-group">
                <label>Customer ID / Passport</label>
                <input type="text" name="cid" required placeholder="ID Number">
            </div>
            <div class="form-group">
                <label>Currency</label>
                <select name="currency" id="currency-${type}">
                    <option value="">-- Select --</option>
                    ${options}
                </select>
            </div>
            <div class="form-group">
                <label>Exchange Rate (${type.toUpperCase()})</label>
                <input type="number" name="rate" required step="0.0001" id="rate-${type}">
                <small class="text-muted">Auto-filled based on admin settings</small>
            </div>
            <div class="form-group">
                <label>Amount (Foreign Currency)</label>
                <input type="number" name="amount" required step="0.01">
            </div>
            <div class="form-group">
                <label>Total (Local Currency)</label>
                <input type="text" name="total" readonly>
            </div>
            <button type="submit" class="btn-primary" id="btn-record-${type}">Record ${type === 'buy' ? 'Purchase' : 'Sale'}</button>
        `;

        const form = document.getElementById(formId);

        // Auto-fill Rate
        const curSelect = document.getElementById(`currency-${type}`);
        curSelect.onchange = () => {
            const code = curSelect.value;
            const curr = currencies.find(c => c.code === code);
            if (curr) {
                // If Buying Foreign (Stock In), we use BUY Rate? 
                // Usually: "We Buy at X" -> Customer gives us Foreign, we give Local.
                // "We Sell at Y" -> Customer gives us Local, we give Foreign.
                const r = type === 'buy' ? curr.buy : curr.sell;
                document.getElementById(`rate-${type}`).value = r;
                calc();
            }
        };

        const calc = () => {
            const amt = parseFloat(form.amount.value) || 0;
            const rate = parseFloat(form.rate.value) || 0;
            form.total.value = (amt * rate).toFixed(2);
        };
        form.amount.addEventListener('input', calc);
        form.rate.addEventListener('input', calc);

        form.onsubmit = (e) => {
            e.preventDefault();
            this.recordTransaction({
                type: type,
                customer: form.customer.value,
                cid: form.cid.value,
                currency: form.currency.value,
                amount: parseFloat(form.amount.value),
                rate: parseFloat(form.rate.value),
                total: parseFloat(form.total.value),
                date: new Date().toISOString()
            });
            form.reset();
        };
    }

    initForms() {
        // Can pre-render or wait for init
    }

    async recordTransaction(data) {
        await window.Store.add(this.txKey, data);
        alert('Transaction Saved Successfully!');

        // Update vault holdings cache if we had one?
        // For now, just re-calc on view load.

        window.App.navigateTo('exchange-dashboard');
    }

    // --- Holdings ---
    async renderHoldings() {
        const txs = await window.Store.get(this.txKey) || [];

        // Initial Vault (Seed) - could be in store, for now hardcoded base
        const vault = {
            USD: 10000,
            EUR: 5000,
            GBP: 5000,
            LOCAL: 500000 // Initial Cash Reserve
        };

        txs.forEach(tx => {
            const amt = tx.amount;
            const total = tx.amount * tx.rate;

            if (tx.type === 'buy') {
                // We BOUGHT Foreign Currency (Stock In) -> We PAID Local
                if (vault[tx.currency] !== undefined) vault[tx.currency] += amt;
                vault.LOCAL -= total;
            } else {
                // We SOLD Foreign Currency (Stock Out) -> We EARNED Local
                if (vault[tx.currency] !== undefined) vault[tx.currency] -= amt;
                vault.LOCAL += total;
            }
        });

        document.getElementById('ex-holdings-usd').textContent = vault.USD.toLocaleString();
        document.getElementById('ex-holdings-eur').textContent = vault.EUR.toLocaleString();
        document.getElementById('ex-holdings-gbp').textContent = vault.GBP.toLocaleString();
        document.getElementById('ex-holdings-local').textContent = vault.LOCAL.toLocaleString();
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
        if (!code || isNaN(buy) || isNaN(sell)) return alert('Invalid Input');

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
        alert('Rates Saved!');
    }

    // --- Records ---
    async renderRecords() {
        const transactions = await window.Store.get(this.txKey) || [];
        const tbody = document.getElementById('exchange-records-body');
        tbody.innerHTML = '';

        // Sort by date desc
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        transactions.forEach(tx => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(tx.date).toLocaleString()}</td>
                <td><span style="font-weight:bold; color:${tx.type === 'buy' ? 'green' : 'red'}">${tx.type.toUpperCase()}</span></td>
                <td>${tx.customer}</td>
                <td>${tx.currency}</td>
                <td>${tx.amount.toFixed(2)}</td>
                <td>${tx.rate.toFixed(4)}</td>
                <td>${(tx.amount * tx.rate).toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

window.ExchangeModule = new ExchangeModule();
