<?php
require_once 'data_store.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// --- TRANSACTIONS ---
if ($action === 'transactions') {
    if ($method === 'GET') {
        $data = getJsonData('exchange_transactions');
        sendResponse($data);
    } elseif ($method === 'POST') {
        $newItem = json_decode(file_get_contents('php://input'), true);
        $list = getJsonData('exchange_transactions');

        $newItem['id'] = time();
        $newItem['date'] = date('c');
        $list[] = $newItem;

        saveJsonData('exchange_transactions', $list);
        sendResponse(['success' => true]);
    }
}

// --- RATES ---
if ($action === 'rates') {
    if ($method === 'GET') {
        $data = getJsonData('exchange_rates');
        // Default seed if empty
        if (empty($data)) {
            $data = [
                ['code' => 'USD', 'buy' => 1.0, 'sell' => 1.02],
                ['code' => 'EUR', 'buy' => 0.9, 'sell' => 0.92],
                ['code' => 'GBP', 'buy' => 0.8, 'sell' => 0.82]
            ];
            saveJsonData('exchange_rates', $data);
        }
        sendResponse($data);
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        saveJsonData('exchange_rates', $data);
        sendResponse(['success' => true]);
    }
}
?>