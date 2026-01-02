<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'data_store.php';

$action = $_GET['action'] ?? '';
$store = new DataStore();

if ($action === 'rates') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $rates = json_decode(file_get_contents("php://input"), true);
        if ($store->save('exchange_rates', $rates)) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false]);
        }
    } else {
        $data = $store->get('exchange_rates');
        // Initial Seed if empty
        if (empty($data)) {
            $data = [
                'USD' => ['buy_rate' => 1.0, 'sell_rate' => 1.02],
                'EUR' => ['buy_rate' => 0.9, 'sell_rate' => 0.92]
            ];
            $store->save('exchange_rates', $data);
        }
        echo json_encode($data);
    }
} elseif ($action === 'transactions') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $item = json_decode(file_get_contents("php://input"), true);
        $res = $store->add('exchange_transactions', $item);
        echo json_encode($res);
    } else {
        echo json_encode($store->get('exchange_transactions'));
    }
} else {
    echo json_encode([]);
}
?>