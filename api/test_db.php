<?php
// api/test_db.php
require_once 'db_connect.php';

try {
    $stmt = $pdo->query("SELECT VERSION()");
    $version = $stmt->fetchColumn();
    echo "Database Connection Successful!\n";
    echo "MySQL Version: " . $version . "\n";

    // Check tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Tables found: " . implode(", ", $tables) . "\n";

} catch (PDOException $e) {
    echo "Connection Failed: " . $e->getMessage() . "\n";
}
?>