<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_connect.php';

$action = $_GET['action'] ?? '';

if ($action === 'stock') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $item = json_decode(file_get_contents("php://input"), true);

        try {
            // Upsert Logic
            // If ID is present and > 0, we try to update. Otherwise INSERT.
            // The schema says ID is AUTO_INCREMENT.

            if (!empty($item['id'])) {
                // Update
                $stmt = $pdo->prepare("UPDATE pharmacy_items SET name=?, buy_price=?, sell_price=?, qty=?, unit_type=?, items_per_unit=?, batch_number=?, mfg_date=?, exp_date=? WHERE id=?");
                $stmt->execute([
                    $item['name'],
                    $item['buy_price'],
                    $item['sell_price'],
                    $item['qty'],
                    $item['unit_type'] ?? 'Item',
                    $item['items_per_unit'] ?? 1,
                    $item['batch_number'] ?? null,
                    $item['mfg_date'] ?? null,
                    $item['exp_date'] ?? null,
                    $item['id']
                ]);
            } else {
                // Insert
                $stmt = $pdo->prepare("INSERT INTO pharmacy_items (name, buy_price, sell_price, qty, unit_type, items_per_unit, batch_number, mfg_date, exp_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $item['name'],
                    $item['buy_price'],
                    $item['sell_price'],
                    $item['qty'],
                    $item['unit_type'] ?? 'Item',
                    $item['items_per_unit'] ?? 1,
                    $item['batch_number'] ?? null,
                    $item['mfg_date'] ?? null,
                    $item['exp_date'] ?? null
                ]);
                $item['id'] = $pdo->lastInsertId();
            }
            echo json_encode(['success' => true, 'data' => $item]);

        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }

    } else {
        $stmt = $pdo->query("SELECT * FROM pharmacy_items");
        echo json_encode($stmt->fetchAll());
    }
} elseif ($action === 'sales') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $sale = json_decode(file_get_contents("php://input"), true);

        try {
            $pdo->beginTransaction();

            $bank_account_id = !empty($sale['bank_account_id']) ? $sale['bank_account_id'] : null;
            $amt = $sale['total_amount'] ?? $sale['total'] ?? 0;

            // 1. Insert Sale
            $stmt = $pdo->prepare("INSERT INTO pharmacy_sales (date, total_amount, payment_method, bank_account_id, doctor_name, patient_name) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $sale['date'] ?? date('Y-m-d H:i:s'),
                $amt,
                $sale['payment_method'] ?? 'cash',
                $bank_account_id,
                $sale['doctor_name'] ?? null,
                $sale['patient_name'] ?? null
            ]);
            $saleId = $pdo->lastInsertId();
            $sale['id'] = $saleId;

            // 2. Insert Items and Deduct Stock
            if (isset($sale['items']) && is_array($sale['items'])) {
                $stmtItem = $pdo->prepare("INSERT INTO pharmacy_sale_items (sale_id, item_id, item_name, quantity_sold, unit_sold_as, unit_price_at_sale, total_price) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmtUpdateStock = $pdo->prepare("UPDATE pharmacy_items SET qty = qty - ? WHERE id = ?");

                foreach ($sale['items'] as $soldItem) {
                    // Check if soldItem has 'id' (item_id)
                    // Sometimes frontend sends it as 'id' or 'item_id'
                    $itemId = $soldItem['id'] ?? $soldItem['item_id'] ?? $soldItem['itemId'];

                    $stmtItem->execute([
                        $saleId,
                        $itemId,
                        $soldItem['name'] ?? '',
                        $soldItem['qty'],
                        $soldItem['unit_sold_as'] ?? 'Item',
                        $soldItem['price'] ?? 0,
                        $soldItem['total'] ?? 0
                    ]);

                    // Deduct
                    $stmtUpdateStock->execute([$soldItem['qty'], $itemId]);
                }
            }

            $pdo->commit();
            echo json_encode(['success' => true, 'data' => $sale]);

        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    } else {
        // Fetch sales with their items
        $stmt = $pdo->query("SELECT * FROM pharmacy_sales ORDER BY date DESC");
        $sales = $stmt->fetchAll();

        // For each sale, fetch its items
        $stmtItems = $pdo->prepare("SELECT * FROM pharmacy_sale_items WHERE sale_id = ?");
        foreach ($sales as &$sale) {
            $stmtItems->execute([$sale['id']]);
            $sale['items'] = $stmtItems->fetchAll();
        }

        echo json_encode($sales);
    }
} elseif ($action === 'delete_stock') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['id'])) {
            $stmt = $pdo->prepare("DELETE FROM pharmacy_items WHERE id = ?");
            if ($stmt->execute([$data['id']])) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Delete failed']);
            }
        }
    }
} elseif ($action === 'delete_sale') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['id'])) {
            $stmt = $pdo->prepare("DELETE FROM pharmacy_sales WHERE id = ?");
            if ($stmt->execute([$data['id']])) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Delete failed']);
            }
        }
    }
} else {
    echo json_encode([]);
}
?>