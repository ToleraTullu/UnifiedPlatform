<?php
require_once 'api/db_connect.php';

try {
    echo "Updating database schema...\n";

    // List of columns to check and add
    $columnsToAdd = [
        'balance' => 'DECIMAL(15, 2) DEFAULT 0.00',
        'min_balance_threshold' => 'DECIMAL(15, 2) DEFAULT 0.00',
        'sectors' => "VARCHAR(255) DEFAULT 'all'"
    ];

    foreach ($columnsToAdd as $column => $definition) {
        $stmt = $pdo->query("SHOW COLUMNS FROM bank_accounts LIKE '$column'");
        if (!$stmt->fetch()) {
            echo "Adding column $column...\n";
            $pdo->exec("ALTER TABLE bank_accounts ADD COLUMN $column $definition");
        } else {
            echo "Column $column already exists.\n";
        }
    }

    echo "Database updated successfully!\n";
} catch (PDOException $e) {
    echo "Error updating database: " . $e->getMessage() . "\n";
}
?>