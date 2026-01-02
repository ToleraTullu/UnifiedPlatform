<?php
require_once 'data_store.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// --- STOCK ---
if ($action === 'stock') {
    if ($method === 'GET') {
        $items = getJsonData('pharmacy_items');
        sendResponse($items);
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data)
            sendResponse(['error' => 'Invalid JSON'], 400);

        $items = getJsonData('pharmacy_items');

        // Update or Add
        $found = false;
        foreach ($items as &$item) {
            if (isset($item['id']) && isset($data['id']) && $item['id'] == $data['id']) {
                $item = array_merge($item, $data);
                $found = true;
                break;
            }
        }

        if (!$found) {
            $data['id'] = time(); // Mock ID
            $items[] = $data;
        }

        saveJsonData('pharmacy_items', $items);
        sendResponse(['success' => true, 'items' => $items]);
    }
}

// --- SALES ---
if ($action === 'sales') {
    if ($method === 'GET') {
        $sales = getJsonData('pharmacy_sales');
        sendResponse($sales);
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $sales = getJsonData('pharmacy_sales');

        $data['id'] = time();
        $data['date'] = date('c');
        $sales[] = $data;

        saveJsonData('pharmacy_sales', $sales);

        // Decrement Stock Logic (server-side safety)
        $stock = getJsonData('pharmacy_items');
        foreach ($data['items'] as $soldItem) {
            foreach ($stock as &$stockItem) {
                if ($stockItem['id'] == $soldItem['itemId']) {
                    $deduction = isset($soldItem['deduction']) ? $soldItem['deduction'] : $soldItem['qty'];
                    $stockItem['qty'] -= $deduction;
                }
            }
        }
        saveJsonData('pharmacy_items', $stock);

        sendResponse(['success' => true]);
    }
}
?>