<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'data_store.php';

$action = $_GET['action'] ?? '';
$store = new DataStore();

if ($action === 'list') {
    // Get all accounts
    $accounts = $store->get('bank_accounts');
    echo json_encode($accounts);

} elseif ($action === 'add') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validation
        if (empty($data['bank_name']) || empty($data['account_number'])) {
            echo json_encode(['success' => false, 'message' => 'Missing required fields']);
            exit;
        }

        $res = $store->add('bank_accounts', $data);
        echo json_encode(['success' => true, 'data' => $res]);
    }

} elseif ($action === 'delete') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'] ?? null;

        if ($id) {
            $accounts = $store->get('bank_accounts');
            // Filter out the one to delete
            $newAccounts = array_filter($accounts, function($acc) use ($id) {
                return isset($acc['id']) && $acc['id'] != $id;
            });
            // Re-index array
            $store->save('bank_accounts', array_values($newAccounts));
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'No ID provided']);
        }
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid Action']);
}
?>
