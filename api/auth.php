<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'data_store.php';

$action = $_GET['action'] ?? '';
$store = new DataStore();

if ($action === 'login') {
    // Read JSON Body
    $data = json_decode(file_get_contents("php://input"));

    // In real app, check hash. Here just mock.
    // Allow any password "123"
    // Users: admin, exchange, pharmacy, construction

    $username = $data->username ?? '';
    $password = $data->password ?? '';

    $validUsers = [
        'admin' => ['role' => 'admin', 'name' => 'Super Admin'],
        'exchange' => ['role' => 'exchange_user', 'name' => 'Money Exchange Staff'],
        'pharmacy' => ['role' => 'pharmacy_user', 'name' => 'Pharmacy Clerk'],
        'construction' => ['role' => 'construction_user', 'name' => 'Site Manager']
    ];

    if (isset($validUsers[$username]) && $password === '123') {
        $user = $validUsers[$username];
        $user['username'] = $username;
        echo json_encode(['success' => true, 'user' => $user]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid Credentials']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid Action']);
}
?>