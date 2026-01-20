-- Database Schema for Unified Platform
-- Run these commands in your MySQL Database (phpMyAdmin)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Recommended: Store hashed passwords
    role ENUM('admin', 'exchange_user', 'pharmacy_user', 'construction_user') NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bank Accounts Table (Moved up for Foreign Key references)
CREATE TABLE IF NOT EXISTS bank_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder VARCHAR(100) NOT NULL,
    sectors VARCHAR(255) DEFAULT 'all', -- Comma-separated: 'exchange,pharmacy,construction' or 'all'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Exchange Rates Table
CREATE TABLE IF NOT EXISTS exchange_rates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE,
    buy_rate DECIMAL(10, 4) NOT NULL,
    sell_rate DECIMAL(10, 4) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Exchange Transactions Table
CREATE TABLE IF NOT EXISTS exchange_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATETIME NOT NULL,
    type ENUM('buy', 'sell') NOT NULL,
    customer_name VARCHAR(100),
    customer_id VARCHAR(50),
    currency_code VARCHAR(3) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    rate DECIMAL(10, 4) NOT NULL,
    total_local DECIMAL(15, 2) NOT NULL,
    description TEXT,
    payment_method ENUM('cash', 'bank', 'credit') DEFAULT 'cash',
    bank_account_id INT NULL,
    external_bank_name VARCHAR(100) NULL,
    external_account_number VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

-- 5. Pharmacy Items Table
CREATE TABLE IF NOT EXISTS pharmacy_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    buy_price DECIMAL(10, 2) NOT NULL,
    sell_price DECIMAL(10, 2), -- Manual override
    qty INT NOT NULL DEFAULT 0, -- Stored as total individual items
    unit_type VARCHAR(20) DEFAULT 'Item', -- Box, Bottle, Strip, Item
    items_per_unit INT DEFAULT 1,
    batch_number VARCHAR(50),
    mfg_date DATE,
    exp_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. Pharmacy Sales Table
CREATE TABLE IF NOT EXISTS pharmacy_sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATETIME NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash', 'bank', 'credit') DEFAULT 'cash',
    bank_account_id INT NULL,
    doctor_name VARCHAR(100) NULL,
    patient_name VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

-- 7. Pharmacy Sale Items (Relational)
CREATE TABLE IF NOT EXISTS pharmacy_sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    item_id INT NOT NULL,
    item_name VARCHAR(100), -- Snapshot in case item is deleted
    quantity_sold INT NOT NULL, -- Total individual items deducted
    unit_sold_as VARCHAR(20), -- e.g. "Box"
    unit_price_at_sale DECIMAL(10, 2),
    total_price DECIMAL(10, 2),
    FOREIGN KEY (sale_id) REFERENCES pharmacy_sales(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES pharmacy_items(id)
);

-- 8. Construction Sites Table
CREATE TABLE IF NOT EXISTS construction_sites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    status ENUM('active', 'completed', 'planned') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Construction Transactions (Expenses)
CREATE TABLE IF NOT EXISTS construction_expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL,
    payment_method ENUM('cash', 'bank', 'credit') DEFAULT 'cash',
    bank_account_id INT NULL,
    external_bank_name VARCHAR(100) NULL,
    external_account_number VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES construction_sites(id),
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

-- 10. Construction Transactions (Income)
CREATE TABLE IF NOT EXISTS construction_income (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL,
    payment_method ENUM('cash', 'bank', 'credit') DEFAULT 'cash',
    bank_account_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES construction_sites(id),
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

-- 11. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    module_name VARCHAR(50) NOT NULL,
    details TEXT,
    performed_by VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initial Data Import (Optional)
INSERT INTO users (username, password, role, name) VALUES 
('admin', '123', 'admin', 'Super Admin'),
('exchange', '123', 'exchange_user', 'Exchange Staff'),
('pharmacy', '123', 'pharmacy_user', 'Pharmacy Clerk'),
('construction', '123', 'construction_user', 'Site Manager');

INSERT INTO exchange_rates (code, buy_rate, sell_rate) VALUES
('USD', 1.0000, 1.0200),
('EUR', 0.9000, 0.9200),
('GBP', 0.8000, 0.8200);
