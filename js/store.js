/**
 * DataStore.js
 * Connectivity to PHP/MySQL Backend
 */

const API_BASE = 'api/';

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
            const result = await res.json();
            // Some endpoints return {success: false, ...}
            if (result && result.success === false) {
                console.error(result.message);
                throw new Error(result.message || 'API Error');
            }
            return result.data || result; 
        } catch (e) {
            console.error(`Failed to add to ${key}:`, e);
            throw e;
        }
    }

    async remove(key, id) {
        let url = '';
        if (key === 'bank_accounts') url = API_BASE + 'bank_accounts.php?action=delete';
        else if (key === 'unified_users') url = API_BASE + 'users.php?action=delete';
        else if (key === 'exchange_transactions') url = API_BASE + 'exchange.php?action=delete_transaction'; // Need to impl
        
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
                return result.success || (result && !result.error); // Handle varies
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
            details: details,
            created_at: new Date().toISOString(),
            performed_by: (JSON.parse(sessionStorage.getItem('active_user') || '{}')).username || 'system'
        };
        // Use internal add to avoid recursive log if we were logging logs (which we aren't here)
        return await this.add('activity_logs', log);
    }

    async addActivityLog(log) {
        return await this.logActivity(log.action_type, log.module_name, log.details);
    }
    
    // Helper to get raw logs if needed
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
