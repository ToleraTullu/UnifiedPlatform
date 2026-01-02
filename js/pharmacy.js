/**
 * Pharmacy.js V2
 * Pharmacy Stock & Sales Module Multi-View
 */

class PharmacyModule {
    constructor() {
        this.stockKey = 'pharmacy_items';
        this.salesKey = 'pharmacy_sales';
        this.cart = [];
        this.initListeners();
    }

    initListeners() {
        document.addEventListener('click', (e) => {
            if(e.target.id === 'btn-pos-add') this.addToCart();
            if(e.target.id === 'btn-pos-checkout') this.checkout();
            if(e.target.id === 'btn-stock-add') this.openStockModal();
            // Modal Listeners could be here or dynamic
        });
    }

    init() {
        // Any init logic
    }

    onViewLoad(action) {
        switch (action) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'pos':
                this.updatePosSelect();
                this.renderCart();
                break;
            case 'stock':
                this.renderStock();
                break;
            case 'records':
                this.renderRecords();
                break;
        }
    }

    // --- Dashboard ---
    async renderDashboard() {
        const sales = await window.Store.get(this.salesKey) || [];
        const stock = await window.Store.get(this.stockKey) || [];

        // Today's Sales
        const todayStr = new Date().toISOString().split('T')[0];
        const todaySales = sales
            .filter(s => (s.date && s.date.startsWith(todayStr)))
            .reduce((acc, curr) => acc + curr.total, 0);

        // Low Stock (< 10)
        const lowStock = stock.filter(i => i.qty < 10).length;

        document.getElementById('ph-today-sales').textContent = todaySales.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
        document.getElementById('ph-low-stock').textContent = lowStock;

        this.updateStats(); // Also sync global
    }

    updateStats() {
        // Global
        const sales = window.Store.get(this.salesKey) || [];
        const total = sales.reduce((a, c) => a + c.total, 0);
        const el = document.getElementById('stat-pharmacy');
        if (el) el.textContent = total.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    }

    // --- POS ---
    async updatePosSelect() {
        const items = await window.Store.get(this.stockKey) || [];
        const select = document.getElementById('pos-item-select');
        select.innerHTML = '<option value="">-- Select Item --</option>';
        items.forEach(i => {
            const disabled = i.qty <= 0 ? 'disabled' : '';
            // Display: Name (Total Items left)
            const label = i.qty <= 0 ? `${i.name} (Out of Stock)` : `${i.name} - ${i.qty} items left`;
            select.innerHTML += `<option value="${i.id}" ${disabled}>${label}</option>`;
        });

        // Inject Unit Type Selector if missing
        if (!document.getElementById('pos-unit-select')) {
            const grp = document.getElementById('pos-qty').parentElement;
            const unitSel = document.createElement('div');
            unitSel.className = 'form-group';
            unitSel.innerHTML = `
                <label>Sell By</label>
                <select id="pos-unit-select">
                    <option value="Item">Single Item</option>
                    <option value="Box">Box / Full Unit</option>
                </select>
             `;
            grp.insertAdjacentElement('afterend', unitSel);
        }
    }

    async addToCart() {
        const select = document.getElementById('pos-item-select');
        const qtyInput = document.getElementById('pos-qty');
        const itemId = parseInt(select.value);
        let qty = parseInt(qtyInput.value); // This is just a number

        // Is user selling Boxes or Single Items?
        // We need a toggle in POS. For now, let's assume Single Items or check logic?
        // Let's add a "Sell Mode" toggle to POS UI in pharmacy.js updatePosSelect logic
        // For simplicity: We only sell "Single Items" in this version OR 
        // we can inspect the selected option data.

        // Updated: The user request implies "do same then selling", meaning choose Unit.
        const unitType = document.getElementById('pos-unit-select').value; // Need to add this to HTML

        if (!itemId || qty <= 0) {
            alert('Please select an item and valid quantity');
            return;
        }

        const items = await window.Store.get(this.stockKey);
        const stockItem = items.find(i => i.id === itemId);

        // Convert request to Total Items
        let deduction = qty;
        let pricePer = stockItem.sell_price || (stockItem.buy_price * 1.5); // Use set sell price or fallback

        if (unitType === 'Box' && stockItem.unit_type === 'Box') {
            deduction = qty * stockItem.items_per_unit;
            pricePer = (stockItem.sell_price || stockItem.buy_price) * stockItem.items_per_unit; // Simplification: Sell Price usually per Item or Box? 
            // Correction: 'sell_price' stored should be per Unit Type defined in stock. 
            // But if we switch unit types it gets complex. 
            // Assumption: 'sell_price' is ALWAYS per SINGLE ITEM for consistency.
            // Let's assume Sell Price is ALWAYS per SINGLE ITEM for consistency.
            pricePer = pricePer * stockItem.items_per_unit;
        } else {
            // Single Item Price = Stored Sell Price
        }

        // Logic Refinement based on user request "do same then selling"
        // If I stock as Box, I expect to sell as Box. 
        // Let's rely on data:
        // We will store 'sell_price' as the price for the UNIT defined. 
        // If I defined Unit=Box, Price=50 -> Price per Box is 50.
        // If I Sell by Item -> Price is 50 / items_per_box.

        const basePrice = stockItem.sell_price || (stockItem.buy_price * 1.5);

        if (unitType === stockItem.unit_type) {
            pricePer = basePrice;
            if (unitType === 'Box') deduction = qty * stockItem.items_per_unit;
        } else if (unitType === 'Item' && stockItem.unit_type !== 'Item') {
            // Selling Single Item from a Box Stock
            pricePer = basePrice / stockItem.items_per_unit;
            deduction = qty;
        } else if (unitType !== 'Item' && stockItem.unit_type === 'Item') {
            // Selling Box from Single Item Stock (Unlikely but possible)
            // Not supported well without defined pack size on item.
            // Fallback
            pricePer = basePrice * (stockItem.items_per_unit || 1);
            deduction = qty * (stockItem.items_per_unit || 1);
        }

        if (stockItem.qty < deduction) {
            alert(`Insufficient Stock! Need ${deduction} items, have ${stockItem.qty}.`);
            return;
        }

        // Add to cart
        this.cart.push({
            itemId,
            name: stockItem.name,
            qty: qty, // Visual qty (e.g. 1 Box)
            unit: unitType,
            deduction: deduction, // Actual stock to remove
            price: pricePer
        });

        this.renderCart();
        qtyInput.value = 1;
        select.value = '';
    }

    renderCart() {
        const list = document.getElementById('pos-cart-list');
        const totalEl = document.getElementById('pos-total');
        if (!list) return;

        list.innerHTML = '';
        let total = 0;

        this.cart.forEach((item, idx) => {
            const itemTotal = item.qty * item.price;
            total += itemTotal;
            list.innerHTML += `
                <li>
                    <span>${item.name} <small>(x${item.qty} ${item.unit})</small></span>
                    <span>$${itemTotal.toFixed(2)} <button onclick="window.PharmacyModule.removeFromCart(${idx})" style="color:red;border:none;background:none;cursor:pointer">×</button></span>
                </li>
            `;
        });

        totalEl.textContent = total.toFixed(2);
    }

    removeFromCart(idx) {
        this.cart.splice(idx, 1);
        this.renderCart();
    }

    async checkout() {
        if (this.cart.length === 0) return;

        // 1. Save Sale Record
        const sale = {
            items: this.cart,
            total: this.cart.reduce((a, c) => a + (c.qty * c.price), 0)
        };
        await window.Store.add(this.salesKey, sale);

        // 2. Decrement Stock -> Handled by API now mostly?
        // Our PHP Sales endpoint updates stock automatically!
        // So we don't need to manually update stock item by item here if using that endpoint.
        // But for safety/feedback let's refresh.
        
        // 3. Clear Cart & UI
        this.cart = [];
        this.renderCart();
        this.updatePosSelect(); // refresh stock numbers in dropdown
        alert('Sale Completed!');
    }

    // --- Stock ---
    async renderStock() {
        const items = await window.Store.get(this.stockKey) || [];
        const tbody = document.getElementById('pharmacy-stock-body');
        if (!tbody) return;

        // Header needs update too - let's inject it if missing or just overwrite body
        const thead = document.querySelector('#view-pharmacy-stock thead tr');
        if (thead && thead.children.length === 5) {
            thead.innerHTML += `<th>Expiry</th>`;
        }

        tbody.innerHTML = '';

        items.forEach(item => {
            const tr = document.createElement('tr');

            // Check Expiry
            let expiryClass = '';
            if (item.exp_date) {
                const today = new Date();
                const exp = new Date(item.exp_date);
                const diffTime = exp - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 30) {
                    expiryClass = 'expired-warning';
                }
            }

            tr.className = expiryClass;
            tr.innerHTML = `
                <td>${item.id}</td>
                <td>
                    <b>${item.name}</b><br>
                    <small class="text-muted">Batch: ${item.batch || '-'}</small>
                </td>
                <td>${item.buy_price}</td>
                <td>${item.qty} ${item.unit_type || 'Items'}</td>
                <td>${item.exp_date || '-'}</td>
                <td>
                    <button class="btn-secondary" onclick="window.PharmacyModule.openStockModal(${item.id})">Edit</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    async openStockModal(itemId = null) {
        const items = await window.Store.get(this.stockKey) || [];
        const item = itemId ? items.find(i => i.id === itemId) : null;

        const modal = document.getElementById('modal-container');
        document.getElementById('modal-title').textContent = item ? 'Edit Item' : 'New Product';

        const body = document.getElementById('modal-body');
        body.innerHTML = `
            <form id="stock-form">
                <input type="hidden" id="st-id" value="${item ? item.id : ''}">
                <div class="form-group">
                    <label>Item Name</label>
                    <input type="text" id="st-name" value="${item ? item.name : ''}" required>
                </div>
                <div class="form-group">
                    <label>Buy Price</label>
                    <input type="number" id="st-price" value="${item ? item.buy_price : ''}" required step="0.01">
                </div>
                <div class="form-group">
                    <label>Qty to Add (Units/Boxes)</label>
                    <input type="number" id="st-qty" value="0" required>
                </div>
                <!-- Logic: Unit Type -->
                <div class="form-group">
                    <label>Unit Type</label>
                    <select id="st-unit">
                        <option value="Item" ${item && item.unit_type === 'Item' ? 'selected' : ''}>Single Item</option>
                        <option value="Box" ${item && item.unit_type === 'Box' ? 'selected' : ''}>Box</option>
                        <option value="Strip" ${item && item.unit_type === 'Strip' ? 'selected' : ''}>Strip</option>
                        <option value="Bottle" ${item && item.unit_type === 'Bottle' ? 'selected' : ''}>Bottle</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Items Per Unit (e.g. 20 pills per Box)</label>
                    <input type="number" id="st-per-unit" value="${item ? item.items_per_unit || 1 : 1}" required min="1">
                    <small>For Single Items, enter 1</small>
                </div>
                
                <div class="form-group">
                    <label>Sell Price (Per Unit)</label>
                    <input type="number" id="st-sell-price" value="${item ? item.sell_price || '' : ''}" required step="0.01">
                </div>
                
                <div class="form-group">
                    <label>Batch Number</label>
                    <input type="text" id="st-batch" value="${item ? item.batch || '' : ''}">
                </div>
                <div class="form-group">
                    <label>Manufacture Date</label>
                    <input type="date" id="st-mfg" value="${item ? item.mfg_date || '' : ''}">
                </div>
                <div class="form-group">
                    <label>Expiry Date</label>
                    <input type="date" id="st-exp" value="${item ? item.exp_date || '' : ''}">
                </div>

                <button type="submit" class="btn-primary">Save</button>
            </form>
        `;

        // Handle Submit
        document.getElementById('stock-form').onsubmit = (e) => {
            e.preventDefault();
            this.saveStockItem({
                id: document.getElementById('st-id').value,
                name: document.getElementById('st-name').value,
                buy_price: parseFloat(document.getElementById('st-price').value),
                // Qty Logic:
                qty_added: parseInt(document.getElementById('st-qty').value),
                items_per_unit: parseInt(document.getElementById('st-per-unit').value),
                unit_type: document.getElementById('st-unit').value,

                // New Fields
                sell_price: parseFloat(document.getElementById('st-sell-price').value),
                batch: document.getElementById('st-batch').value,
                mfg_date: document.getElementById('st-mfg').value,
                exp_date: document.getElementById('st-exp').value
            }, item);
            modal.classList.add('hidden');
        };

        modal.classList.remove('hidden');
        modal.querySelector('.close-modal').onclick = () => modal.classList.add('hidden');
    }

    async saveStockItem(formData, originalItem) {
        // Logic change: We send data to API via Store.add (which uses POST)
        // Store.add in new implementation handles both Add and Update if API supports it.
        // Our PHP API Pharmacy 'stock' endpoints merges if ID exists.
        
        let payload = {
             ...formData,
             // Ensure ID is passed if editing
             id: originalItem ? originalItem.id : undefined
        };
        
        await window.Store.add(this.stockKey, payload);
        this.renderStock();
    }

    // --- Records ---
    renderRecords() {
        const sales = window.Store.get(this.salesKey) || [];
        const tbody = document.getElementById('pharmacy-records-body');
        tbody.innerHTML = '';

        sales.sort((a, b) => new Date(b.date) - new Date(a.date));

        sales.forEach(s => {
            const itemNames = s.items.map(i => `${i.name} (x${i.qty})`).join(', ');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(s.date).toLocaleString()}</td>
                <td>${itemNames}</td>
                <td>${s.total.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

window.PharmacyModule = new PharmacyModule();
