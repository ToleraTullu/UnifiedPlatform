<?php
// api/db_connect.php

$host = 'mysql-db03.remote:33636';
$db = 'unifiedp';
$user = 'DBuser';
$pass = 'BRG0918803273';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // In production, log this error instead of showing it
    // error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database Connection Failed: ' . $e->getMessage()]);
    exit;
}
?>