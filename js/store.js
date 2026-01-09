/**
 * AsyncStore.js (Mock Implementation)
 * Replaces fetch-based Store with Promisified LocalStorage for environment without PHP server.
 */

const MOCK_USERS = [
    { username: 'admin', password: '123', role: 'admin', name: 'Super Admin' },
    { username: 'exchange', password: '123', role: 'exchange_user', name: 'Money Exchange Staff' },
    { username: 'pharmacy', password: '123', role: 'pharmacy_user', name: 'Pharmacy Clerk' },
    { username: 'construction', password: '123', role: 'construction_user', name: 'Site Manager' }
];

const INIT_KEYS = {
    'unified_users': MOCK_USERS,
    'exchange_transactions': [],
    'exchange_rates': {},
    'exchange_holdings': {},
    'pharmacy_items': [
        { id: 1, name: 'Paracetamol', buy_price: 10, sell_price: 15, qty: 100, unit_type: 'pcs', pieces_per_box: 1, manuf_date: '2024-01-01', expiry_date: '2026-01-01' },
        { id: 2, name: 'Amoxicillin', buy_price: 25, sell_price: 40, qty: 50, unit_type: 'box', pieces_per_box: 10, manuf_date: '2023-06-01', expiry_date: '2025-06-01' },
        { id: 3, name: 'Vitamin C', buy_price: 5, sell_price: 8, qty: 200, unit_type: 'pcs', pieces_per_box: 1, manuf_date: '2024-03-01', expiry_date: '2026-03-01' }
    ],
    'pharmacy_sales': [],
    'construction_sites': [],
    'construction_expenses': [],
    'construction_income': [],
    'bank_accounts': [],
    'activity_logs': []
};

class AsyncStore {
    constructor() {
        this.init();
    }

    async init() {
        console.log('Store initialized in (Mock) Async Mode');
        // Initialize mock data if not present
        Object.entries(INIT_KEYS).forEach(([key, val]) => {
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify(val));
            }
        });
        return true;
    }

    async get(key) {
        // Simulate network delay
        await new Promise(r => setTimeout(r, 50));
        const data = localStorage.getItem(key);
        // Special case for rates: return object, others array (mostly)
        if (!data) return INIT_KEYS[key] || (key.includes('rates') ? {} : []);
        return JSON.parse(data);
    }

    async add(key, item) {
        await new Promise(r => setTimeout(r, 50));
        const list = await this.get(key) || [];
        // Ensure it's an array
        if (!Array.isArray(list)) {
            console.error(`Cannot add to non-array key: ${key}`);
            return false;
        }
        item.id = Date.now();
        item.date = item.date || new Date().toISOString(); // Ensure date
        list.push(item);
        localStorage.setItem(key, JSON.stringify(list));
        return item;
    }

    async remove(key, id) {
        await new Promise(r => setTimeout(r, 50));
        const list = await this.get(key) || [];
        if (!Array.isArray(list)) return false;
        
        const newList = list.filter(item => item.id != id);
        if (newList.length === list.length) return false; // No item removed
        
        localStorage.setItem(key, JSON.stringify(newList));
        return true;
    }

    async set(key, value) {
        await new Promise(r => setTimeout(r, 50));
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    }

    async logActivity(action, module, details) {
        const log = {
            id: Date.now(),
            action_type: action,
            module_name: module,
            details: details,
            timestamp: new Date().toISOString(),
            current_user: (JSON.parse(sessionStorage.getItem('active_user') || '{}')).username || 'system'
        };
        return await this.add('activity_logs', log);
    }

    async addActivityLog(log) {
        return await this.logActivity(log.action_type, log.module_name, log.details);
    }

    async getActivityLogs(limit = null) {
        // Simulate delay
        await new Promise(r => setTimeout(r, 50));
        const logs = await this.get('activity_logs') || [];
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return limit ? logs.slice(0, limit) : logs;
    }
}

window.Store = new AsyncStore();
