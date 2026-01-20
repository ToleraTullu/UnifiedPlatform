/**
 * DataStore.js
 * Connectivity to PHP/MySQL Backend
 */

const API_BASE = 'api/';

const INIT_KEYS = {
  unified_users: MOCK_USERS,
  exchange_transactions: [],
  pharmacy_items: [
    {
      id: 1,
      name: "Paracetamol",
      buy_price: 10,
      sell_price: 15,
      qty: 100,
      unit_type: "pcs",
      pieces_per_box: 1,
      manuf_date: "2024-01-01",
      expiry_date: "2026-01-01",
    },
    {
      id: 2,
      name: "Amoxicillin",
      buy_price: 25,
      sell_price: 40,
      qty: 50,
      unit_type: "box",
      pieces_per_box: 10,
      manuf_date: "2023-06-01",
      expiry_date: "2025-06-01",
    },
    {
      id: 3,
      name: "Vitamin C",
      buy_price: 5,
      sell_price: 8,
      qty: 200,
      unit_type: "pcs",
      pieces_per_box: 1,
      manuf_date: "2024-03-01",
      expiry_date: "2026-03-01",
    },
  ],
  pharmacy_sales: [],
  construction_expenses: [],
  construction_income: [],
  bank_accounts: [],
  exchange_rates: {
    USD: { buy: 1.0, sell: 1.02 },
    EUR: { buy: 0.9, sell: 0.92 },
    GBP: { buy: 0.8, sell: 0.82 }
  },
const ENDPOINTS = {
    'unified_users': 'users.php',
    'exchange_transactions': 'exchange.php?action=transactions',
    'exchange_rates': 'exchange.php?action=rates',
    'pharmacy_items': 'pharmacy.php?action=stock',
    'pharmacy_sales': 'pharmacy.php?action=sales',
    'construction_sites': 'construction.php?action=sites',
    'construction_expenses': 'construction.php?action=expenses',
    'construction_income': 'construction.php?action=income',
    'bank_accounts': 'bank_accounts.php',
    'activity_logs': 'logs.php'
};

class DataStore {
    constructor() {
        console.log('Store initialized in MySQL Mode');
    }

    async get(key) {
        if (!ENDPOINTS[key]) {
            console.warn(`Unknown Store Key: ${key}`);
            return [];
        }

        let url = API_BASE + ENDPOINTS[key];
        // Handle specific actions for GET if needed (most defaults are GET)
        if (key === 'bank_accounts') url += '?action=list';
        if (key === 'activity_logs') url += '?action=list';
        if (key === 'unified_users') url += '?action=list';

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return data;
        } catch (e) {
            console.error(`Failed to fetch ${key}:`, e);
            return [];
        }
    }

    async add(key, item) {
        if (!ENDPOINTS[key]) return false;

        let url = API_BASE + ENDPOINTS[key];
        // Ensure action is explicitly set for some if the map didn't have it
        if (key === 'bank_accounts') url += '?action=add';
        if (key === 'activity_logs') url += '?action=add';
        if (key === 'unified_users') url += '?action=add';
        
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            
            // Check for HTTP errors first
            if (!res.ok) {
                let errorMsg = `HTTP Error ${res.status}`;
                try {
                    const errData = await res.json();
                    if (errData.message) errorMsg = errData.message;
                } catch(e) {}
                throw new Error(errorMsg);
            }

            const result = await res.json();
            
            // Handle Standardized Backend Response { success: true, data: ... }
            if (result && result.success) {
                return result.data || result;
            }
            // Handle Legacy or Error Response
            if (result && result.success === false) {
                 const msg = result.message || 'Unknown API Error';
                 console.error('API Error:', msg);
                 throw new Error(msg);
            }
            
            // Fallback for endpoints we might have missed or are just returning data directly
            return result; 
        } catch (e) {
            console.error(`Store.add failed for ${key}:`, e);
            // Re-throw so the caller knows it failed!
            throw e; 
        }
    }

    async remove(key, id) {
        let url = '';
        if (key === 'bank_accounts') url = API_BASE + 'bank_accounts.php?action=delete';
        else if (key === 'unified_users') url = API_BASE + 'users.php?action=delete';
        else if (key === 'exchange_transactions') url = API_BASE + 'exchange.php?action=delete_transaction'; 
        
        if (!url) {
            console.warn(`Delete not implemented for ${key} in Store/API`);
            return false;
        }

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            });
            const result = await res.json();
            return result.success;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async set(key, value) {
        // Primarily for Exchange Rates
        if (key === 'exchange_rates') {
            const url = API_BASE + ENDPOINTS[key]; // exchange.php?action=rates
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(value)
                });
                const result = await res.json();
                return result.success || (result && !result.error);
            } catch (e) {
                console.error(e);
                return false;
            }
        }
        return false;
    }

    async logActivity(action, module, details) {
        const log = {
            action_type: action,
            module_name: module,
            details: details,
            created_at: new Date().toISOString(),
            performed_by: (JSON.parse(sessionStorage.getItem('active_user') || '{}')).username || 'system'
        };
        return await this.add('activity_logs', log);
    }

    async addActivityLog(log) {
        return await this.logActivity(log.action_type, log.module_name, log.details);
    }
    
    async getActivityLogs(limit = 50) {
        const url = API_BASE + `logs.php?action=list&limit=${limit}`;
        try {
            const res = await fetch(url);
            return await res.json();
        } catch (e) {
            return [];
        }
    }
}

window.Store = new DataStore();
