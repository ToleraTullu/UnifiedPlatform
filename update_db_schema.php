<?php
require_once 'api/db_connect.php';

try {
    echo "Updating database schema...\n";

    // Add balance column if it doesn't exist
    $pdo->exec("
        ALTER TABLE bank_accounts 
        ADD COLUMN IF NOT EXISTS balance DECIMAL(15, 2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS min_balance_threshold DECIMAL(15, 2) DEFAULT 0.00;
    ");

    echo "Database updated successfully!\n";
} catch (PDOException $e) {
    echo "Error updating database: " . $e->getMessage() . "\n";
}
?>
