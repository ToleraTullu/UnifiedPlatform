<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'data_store.php';

$action = $_GET['action'] ?? '';
$store = new DataStore();

if ($action === 'stock') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $item = json_decode(file_get_contents("php://input"), true);
        // If ID exists on stock item, we might be updating?
        // Basic Store.add() just appends. For STOCK we might need update.
        // For simplicity, we just add or overwrite entire list?
        // App sends single item usually.
        // Let's rely on basic Add for now, or handle 'update' logic if ID matches?
        // Our DataStore 'add' appends.
        // Real logic: Find and replace if ID matches.

        // Custom logic for stock update:
        $stock = $store->get('pharmacy_items');
        $found = false;
        if (isset($item['id'])) {
            foreach ($stock as &$current) {
                if ($current['id'] == $item['id']) {
                    $current = array_merge($current, $item);
                    $found = true;
                    break;
                }
            }
        }

        if ($found) {
            $store->save('pharmacy_items', $stock);
            echo json_encode(['success' => true]);
        } else {
            $res = $store->add('pharmacy_items', $item);
            echo json_encode($res);
        }
    } else {
        $data = $store->get('pharmacy_items');
        if (empty($data)) {
            // Seed
            $data = [
                ['id' => 1, 'name' => 'Paracetamol', 'buy_price' => 10, 'sell_price' => 15, 'qty' => 100],
                ['id' => 2, 'name' => 'Vitamin C', 'buy_price' => 5, 'sell_price' => 8, 'qty' => 50]
            ];
            $store->save('pharmacy_items', $data);
        }
        echo json_encode($data);
    }
} elseif ($action === 'sales') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $sale = json_decode(file_get_contents("php://input"), true);
        $res = $store->add('pharmacy_sales', $sale);

        // Also update stock
        // Assuming sale contains items: [{id: 1, qty: 2}]
        if (isset($sale['items']) && is_array($sale['items'])) {
            $stock = $store->get('pharmacy_items');
            foreach ($sale['items'] as $soldItem) {
                foreach ($stock as &$stockItem) {
                    if ($stockItem['id'] == $soldItem['id']) {
                        $stockItem['qty'] -= $soldItem['qty'];
                    }
                }
            }
            $store->save('pharmacy_items', $stock);
        }

        echo json_encode($res);
    } else {
        echo json_encode($store->get('pharmacy_sales'));
    }
} else {
    echo json_encode([]);
}
?>