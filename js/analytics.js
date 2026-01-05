/**
 * Analytics.js
 * Comprehensive reporting and analytics for the unified platform
 */

class Analytics {
    constructor() {
        this.currentPeriod = 30; // days
        this.charts = {};
    }

    async init() {
        // Initial load of library and data
        this.loadChartLibrary();
    }

    loadChartLibrary() {
        if (!window.Chart) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => {
                console.log('Chart.js loaded');
                // No need to auto-init, App.js calls renderAnalytics
            };
            document.head.appendChild(script);
        }
    }

    async renderAnalytics() {
        console.log('Rendering Analytics...');
        this.updatePeriodSelector();
        await this.calculateMetrics();
        await this.renderCharts();
        await this.renderTopItems();
        await this.renderTransactionSummary();
        this.setupEventListeners();
    }

    updatePeriodSelector() {
        const selector = document.getElementById('analytics-period');
        if (selector) {
            selector.value = this.currentPeriod;
        }
    }

    async calculateMetrics() {
        const now = new Date();
        const periodStart = new Date(now.getTime() - (this.currentPeriod * 24 * 60 * 60 * 1000));
        const previousPeriodStart = new Date(periodStart.getTime() - (this.currentPeriod * 24 * 60 * 60 * 1000));

        const currentMetrics = await this.getMetricsForPeriod(periodStart, now);
        const previousMetrics = await this.getMetricsForPeriod(previousPeriodStart, periodStart);

        this.updateMetricDisplay('analytics-total-revenue', currentMetrics.totalRevenue, previousMetrics.totalRevenue);
        this.updateMetricDisplay('analytics-exchange-volume', currentMetrics.exchangeVolume, previousMetrics.exchangeVolume);
        this.updateMetricDisplay('analytics-pharmacy-sales', currentMetrics.pharmacySales, previousMetrics.pharmacySales);
        this.updateMetricDisplay('analytics-construction-profit', currentMetrics.constructionProfit, previousMetrics.constructionProfit);
    }

    async getMetricsForPeriod(startDate, endDate) {
        const metrics = {
            totalRevenue: 0,
            exchangeVolume: 0,
            pharmacySales: 0,
            constructionProfit: 0
        };

        // 1. Exchange
        const exchangeTx = await window.Store.get('exchange_transactions') || [];
        exchangeTx.forEach(tx => {
            const txDate = new Date(tx.date);
            if (txDate >= startDate && txDate <= endDate) {
                const vol = parseFloat(tx.total || 0);
                metrics.exchangeVolume += vol;
                metrics.totalRevenue += vol * 0.02; // 2% markup estimate
            }
        });

        // 2. Pharmacy
        const pharmacySales = await window.Store.get('pharmacy_sales') || [];
        pharmacySales.forEach(sale => {
            const saleDate = new Date(sale.date);
            if (saleDate >= startDate && saleDate <= endDate) {
                metrics.pharmacySales += sale.total;
                metrics.totalRevenue += sale.total * 0.25; // 25% profit margin estimate
            }
        });

        // 3. Construction
        const constructionIncome = await window.Store.get('construction_income') || [];
        const constructionExpenses = await window.Store.get('construction_expenses') || [];

        let incVal = 0, expVal = 0;
        constructionIncome.forEach(inc => {
            const incDate = new Date(inc.date);
            if (incDate >= startDate && incDate <= endDate) incVal += inc.amount;
        });
        constructionExpenses.forEach(exp => {
            const expDate = new Date(exp.date);
            if (expDate >= startDate && expDate <= endDate) expVal += exp.amount;
        });

        metrics.constructionProfit = incVal - expVal;
        metrics.totalRevenue += Math.max(0, metrics.constructionProfit); // Add to revenue if profitable

        return metrics;
    }

    updateMetricDisplay(elementId, currentValue, previousValue) {
        const element = document.getElementById(elementId);
        const changeElement = document.getElementById(elementId + '-change');

        if (element) {
            element.textContent = currentValue.toLocaleString(undefined, {
                style: 'currency',
                currency: 'USD'
            });
        }

        if (changeElement) {
            const change = previousValue !== 0 ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100 : 0;
            const isPos = change >= 0;
            changeElement.innerHTML = `<span style="color:${isPos ? 'var(--success)' : 'var(--danger)'}">
                ${isPos ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}%</span> from last period`;
        }
    }

    async renderCharts() {
        if (!window.Chart) return setTimeout(() => this.renderCharts(), 500);
        await this.renderRevenueTrendChart();
        await this.renderModulePerformanceChart();
    }

    async renderRevenueTrendChart() {
        const ctx = document.getElementById('revenue-trend-chart');
        if (!ctx) return;

        const data = await this.generateTrendData(this.currentPeriod);

        if (this.charts.revenueTrend) this.charts.revenueTrend.destroy();

        this.charts.revenueTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Platform Revenue',
                    data: data.revenue,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString() } }
                }
            }
        });
    }

    async renderModulePerformanceChart() {
        const ctx = document.getElementById('module-performance-chart');
        if (!ctx) return;

        const data = await this.getModulePerformanceData();

        if (this.charts.modulePerformance) this.charts.modulePerformance.destroy();

        this.charts.modulePerformance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Exchange', 'Pharmacy', 'Construction'],
                datasets: [{
                    data: data.values,
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    async generateTrendData(days) {
        const labels = [];
        const revenue = [];
        const now = new Date();

        // Fetch all data once to avoid repeated Store.get calls in a loop
        const exTx = await window.Store.get('exchange_transactions') || [];
        const phTx = await window.Store.get('pharmacy_sales') || [];
        const coInc = await window.Store.get('construction_income') || [];
        const coExp = await window.Store.get('construction_expenses') || [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
            labels.push(date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

            const dayStart = new Date(date); dayStart.setHours(0,0,0,0);
            const dayEnd = new Date(date); dayEnd.setHours(23,59,59,999);

            let dayRev = 0;
            // Exchange
            exTx.forEach(t => { if(new Date(t.date) >= dayStart && new Date(t.date) <= dayEnd) dayRev += parseFloat(t.total) * 0.02; });
            // Pharmacy
            phTx.forEach(t => { if(new Date(t.date) >= dayStart && new Date(t.date) <= dayEnd) dayRev += t.total * 0.25; });
            // Construction
            let coDay = 0;
            coInc.forEach(t => { if(new Date(t.date) >= dayStart && new Date(t.date) <= dayEnd) coDay += t.amount; });
            coExp.forEach(t => { if(new Date(t.date) >= dayStart && new Date(t.date) <= dayEnd) coDay -= t.amount; });
            dayRev += Math.max(0, coDay);

            revenue.push(dayRev);
        }
        return { labels, revenue };
    }

    async getModulePerformanceData() {
        const now = new Date();
        const start = new Date(now.getTime() - (this.currentPeriod * 24 * 60 * 60 * 1000));
        const metrics = await this.getMetricsForPeriod(start, now);
        return {
            values: [metrics.exchangeVolume, metrics.pharmacySales, Math.abs(metrics.constructionProfit)]
        };
    }

    async renderTopItems() {
        const container = document.getElementById('top-items-list');
        if (!container) return;

        const phSales = await window.Store.get('pharmacy_sales') || [];
        const items = {};
        phSales.forEach(s => {
            (s.items || []).forEach(it => {
                if(!items[it.name]) items[it.name] = 0;
                items[it.name] += it.price * it.qty;
            });
        });

        const sorted = Object.entries(items).sort((a,b) => b[1] - a[1]).slice(0, 10);
        
        if (sorted.length === 0) {
            container.innerHTML = '<div class="empty-state">No sales data found</div>';
            return;
        }

        container.innerHTML = sorted.map(([name, val]) => `
            <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid var(--border-color);">
                <span style="font-weight:600">${name}</span>
                <span class="badge badge-pharmacy">$${val.toFixed(2)}</span>
            </div>
        `).join('');
    }

    async renderTransactionSummary() {
        const tbody = document.getElementById('transaction-summary-body');
        if (!tbody) return;

        const now = new Date();
        const start = new Date(now.getTime() - (this.currentPeriod * 24 * 60 * 60 * 1000));
        
        const metrics = await this.getMetricsForPeriod(start, now);
        
        // Need counts too
        const ex = await window.Store.get('exchange_transactions') || [];
        const ph = await window.Store.get('pharmacy_sales') || [];
        const coI = await window.Store.get('construction_income') || [];
        const coE = await window.Store.get('construction_expenses') || [];

        const exC = ex.filter(t => new Date(t.date) >= start).length;
        const phC = ph.filter(t => new Date(t.date) >= start).length;
        const coC = coI.filter(t => new Date(t.date) >= start).length + coE.filter(t => new Date(t.date) >= start).length;

        tbody.innerHTML = `
            <tr>
                <td><strong>Exchange</strong></td>
                <td>${exC}</td>
                <td>$${metrics.exchangeVolume.toLocaleString()}</td>
                <td>$${exC > 0 ? (metrics.exchangeVolume / exC).toFixed(2) : '0.00'}</td>
            </tr>
            <tr>
                <td><strong>Pharmacy</strong></td>
                <td>${phC}</td>
                <td>$${metrics.pharmacySales.toLocaleString()}</td>
                <td>$${phC > 0 ? (metrics.pharmacySales / phC).toFixed(2) : '0.00'}</td>
            </tr>
            <tr>
                <td><strong>Construction</strong></td>
                <td>${coC}</td>
                <td>$${Math.abs(metrics.constructionProfit).toLocaleString()}</td>
                <td>$${coC > 0 ? (Math.abs(metrics.constructionProfit) / coC).toFixed(2) : '0.00'}</td>
            </tr>
        `;
    }

    setupEventListeners() {
        const selector = document.getElementById('analytics-period');
        if (selector) {
            selector.onchange = (e) => {
                this.currentPeriod = parseInt(e.target.value);
                this.renderAnalytics();
            };
        }

        const exportBtn = document.getElementById('export-analytics-btn');
        if (exportBtn) {
            exportBtn.onclick = () => this.exportReport();
        }
    }

    async exportReport() {
        const now = new Date();
        const start = new Date(now.getTime() - (this.currentPeriod * 24 * 60 * 60 * 1000));
        const metrics = await this.getMetricsForPeriod(start, now);

        let csv = "Module,Metric,Value\n";
        csv += `Platform,Current Period,${this.currentPeriod} Days\n`;
        csv += `Platform,Total Revenue,${metrics.totalRevenue}\n`;
        csv += `Exchange,Volume,${metrics.exchangeVolume}\n`;
        csv += `Pharmacy,Sales,${metrics.pharmacySales}\n`;
        csv += `Construction,Balance,${metrics.constructionProfit}\n`;

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `UniManage_Report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }
}

window.Analytics = new Analytics();