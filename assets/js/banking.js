/**
 * Banking.js
 * Handles sector-specific bank management
 */
class BankingModule {
    constructor(sector) {
        this.sector = sector;
        this.banksKey = 'bank_accounts';
    }

    async init() {
        this.prefix = this.sector === 'exchange' ? 'ex' : (this.sector === 'pharmacy' ? 'ph' : 'cons');
        await this.renderAccounts();
        await this.renderBalanceChart();
        this.initTransferForm();
    }

    async renderBalanceChart() {
        const banks = await window.Store.get(this.banksKey) || [];
        const filtered = banks.filter(b => {
             if (b.sectors === 'all' || !b.sectors) return true;
             const sList = typeof b.sectors === 'string' ? b.sectors.split(',') : (Array.isArray(b.sectors) ? b.sectors : []);
             return sList.includes(this.sector);
        });

        // Use sector name for ID, e.g. 'exchange-bank-chart'
        const canvasId = `${this.sector}-bank-chart`;
        const canvas = document.getElementById(canvasId);

        if (!canvas || filtered.length === 0) return;

        if (!window.Chart) {
             if (!window.AnalyticsLoadPromise) {
                 const script = document.createElement('script');
                 script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
                 window.AnalyticsLoadPromise = new Promise(resolve => script.onload = resolve);
                 document.head.appendChild(script);
             }
             await window.AnalyticsLoadPromise;
        }

        const labels = filtered.map(b => b.bank_name);
        const data = filtered.map(b => parseFloat(b.balance));
        const colors = filtered.map(b => parseFloat(b.balance) < parseFloat(b.min_balance_threshold) ? '#ef4444' : '#3b82f6');

        if (this.bankChart) this.bankChart.destroy();

        this.bankChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Current Balance',
                    data: data,
                    backgroundColor: colors,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                     tooltip: {
                         callbacks: {
                            label: (ctx) => `Balance: ${ctx.parsed.y.toLocaleString(undefined, {style:'currency', currency:'USD'})}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => value.toLocaleString(undefined, {notation: 'compact'})
                        }
                    }
                }
            }
        });
    }

    async renderAccounts() {
        const banks = await window.Store.get(this.banksKey) || [];
        const filtered = banks.filter(b => {
             if (b.sectors === 'all' || !b.sectors) return true;
             const sList = typeof b.sectors === 'string' ? b.sectors.split(',') : (Array.isArray(b.sectors) ? b.sectors : []);
             return sList.includes(this.sector);
        });

        const tbody = document.getElementById(`${this.prefix}-banks-body`);
        if (!tbody) return;
        tbody.innerHTML = '';

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No bank accounts assigned to this sector</td></tr>';
            return;
        }

        filtered.forEach(b => {
            const tr = document.createElement('tr');
            const balance = parseFloat(b.balance || 0);
            const threshold = parseFloat(b.min_balance_threshold || 0);
            const lowBalance = balance < threshold;

            tr.innerHTML = `
                <td>
                    <div style="font-weight:600">${b.bank_name}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted)">Acc: ${b.account_number}</div>
                </td>
                <td>${b.account_holder}</td>
                <td>
                    <div style="font-weight:bold; color:${lowBalance ? 'var(--danger)' : 'var(--success)'}">
                        ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    ${lowBalance ? '<small style="color:var(--danger)">⚠️ Below Limit</small>' : ''}
                </td>
                <td style="text-align:right">
                    <button class="btn-primary transfer-btn" data-id="${b.id}" data-name="${b.bank_name}">Transfer</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Dropdowns for Transfer
        this.populateTransferDropdowns(filtered);
    }

    populateTransferDropdowns(accounts) {
        const form = document.getElementById(`${this.prefix}-transfer-form`);
        if (!form) return;
        
        const fromSelect = form.querySelector('[name="from_account_id"]');
        const toSelect = form.querySelector('[name="to_account_id"]');
        if (!fromSelect || !toSelect) return;

        fromSelect.innerHTML = '<option value="">Select Account</option>';
        toSelect.innerHTML = '<option value="">Select Account</option>';

        accounts.forEach(acc => {
            const opt = `<option value="${acc.id}">${acc.bank_name} (${acc.account_number})</option>`;
            fromSelect.innerHTML += opt;
            toSelect.innerHTML += opt;
        });
    }

    initTransferForm() {
        const form = document.getElementById(`${this.prefix}-transfer-form`);
        if (!form) return;

        form.onsubmit = async (e) => {
            e.preventDefault();
            const fromId = form['from_account_id'].value;
            const toId = form['to_account_id'].value;
            const amount = parseFloat(form['amount'].value);

            if (fromId === toId) {
                alert('Cannot transfer to the same account');
                return;
            }

            if (!amount || amount <= 0) {
                alert('Invalid amount');
                return;
            }

            try {
                const btn = form.querySelector('button[type="submit"]');
                btn.disabled = true;
                btn.textContent = 'Processing...';

                await window.Store.transferFunds(fromId, toId, amount);
                
                // Log activity
                await window.Store.logActivity('TRANSFER', this.sector, `Transferred ${amount} from ${fromId} to ${toId}`);

                alert('Transfer Successful!');
                form.reset();
                await this.renderAccounts();
            } catch (err) {
                alert('Error: ' + err.message);
            } finally {
                const btn = form.querySelector('button[type="submit"]');
                btn.disabled = false;
                btn.textContent = 'Complete Transfer';
            }
        };
    }
}

window.BankingModule = BankingModule;
