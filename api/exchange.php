<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_connect.php';

$action = $_GET['action'] ?? '';

if ($action === 'rates') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $rates = json_decode(file_get_contents("php://input"), true);

        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("INSERT INTO exchange_rates (code, buy_rate, sell_rate) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE buy_rate = VALUES(buy_rate), sell_rate = VALUES(sell_rate)");

            foreach ($rates as $code => $rate) {
                $stmt->execute([$code, $rate['buy_rate'], $rate['sell_rate']]);
            }
            $pdo->commit();
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    } else {
        $stmt = $pdo->query("SELECT * FROM exchange_rates");
        $rows = $stmt->fetchAll();

        // Format to match frontend expectation: { "USD": { "buy_rate": ..., "sell_rate": ... } }
        $data = [];
        foreach ($rows as $row) {
            $data[$row['code']] = [
                'buy_rate' => (float) $row['buy_rate'],
                'sell_rate' => (float) $row['sell_rate']
            ];
        }
        echo json_encode($data);
    }
} elseif ($action === 'transactions') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);

        // Prepare INSERT
        $sql = "INSERT INTO exchange_transactions 
                (date, type, customer_name, customer_id, currency_code, amount, rate, total_local, payment_method, bank_account_id, external_bank_name, external_account_number) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $pdo->prepare($sql);

        try {
            $stmt->execute([
                $data['date'] ?? date('Y-m-d H:i:s'),
                $data['type'],
                $data['customer_name'] ?? '',
                $data['customer_id'] ?? '',
                $data['currency_code'],
                $data['amount'],
                $data['rate'],
                $data['total_local'],
                $data['payment_method'] ?? 'cash',
                $data['bank_account_id'] ?? null,
                $data['external_bank_name'] ?? null,
                $data['external_account_number'] ?? null
            ]);
            // Return item with new ID
            $data['id'] = $pdo->lastInsertId();
            echo json_encode($data);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }

    } else {
        $stmt = $pdo->query("SELECT * FROM exchange_transactions ORDER BY date DESC");
        echo json_encode($stmt->fetchAll());
    }
} else {
    echo json_encode([]);
}
?>