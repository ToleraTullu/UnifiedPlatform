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
            // Clear existing rates to allow "deletion" by omission in the UI
            $pdo->exec("DELETE FROM exchange_rates");

            $stmt = $pdo->prepare("INSERT INTO exchange_rates (code, buy_rate, sell_rate) VALUES (?, ?, ?)");

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

        // Format to match frontend expectation
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
                (date, type, customer_name, customer_id, currency_code, amount, rate, total_local, description, payment_method, bank_account_id, external_bank_name, external_account_number) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $pdo->prepare($sql);

        try {
            // Fix: Handle empty string for bank_account_id as NULL
            $bankAccountId = !empty($data['bank_account_id']) ? $data['bank_account_id'] : null;

            // Balance Update Logic
            if ($bankAccountId && ($data['payment_method'] ?? 'cash') === 'bank') {
                // Verify funds for BUY (We are paying out, so balance decreases)
                // Or for SELL (We are receiving, so balance increases)

                // NOTE: 'buy' means we buy Foreign Currency, we PAY Local Currency. 
                // 'sell' means we sell Foreign Currency, we RECEIVE Local Currency.
                // Assuming 'total_local' is the amount taken/given from the bank account (Local Currency Account).

                if ($data['type'] === 'buy') {
                    // We pay out Local Currency
                    $stmtCheck = $pdo->prepare("SELECT balance FROM bank_accounts WHERE id = ?");
                    $stmtCheck->execute([$bankAccountId]);
                    $acc = $stmtCheck->fetch();
                    if (!$acc || $acc['balance'] < $data['total_local']) {
                        throw new Exception("Insufficient bank funds");
                    }
                    $stmtUpdate = $pdo->prepare("UPDATE bank_accounts SET balance = balance - ? WHERE id = ?");
                    $stmtUpdate->execute([$data['total_local'], $bankAccountId]);
                } elseif ($data['type'] === 'sell') {
                    // We receive Local Currency
                    $stmtUpdate = $pdo->prepare("UPDATE bank_accounts SET balance = balance + ? WHERE id = ?");
                    $stmtUpdate->execute([$data['total_local'], $bankAccountId]);
                }
            }

            $stmt->execute([
                date('Y-m-d H:i:s', strtotime($data['date'] ?? 'now')),
                $data['type'],
                $data['customer_name'] ?? '',
                $data['customer_id'] ?? '',
                $data['currency_code'],
                $data['amount'],
                $data['rate'],
                $data['total_local'],
                $data['description'] ?? '',
                $data['payment_method'] ?? 'cash',
                $bankAccountId,
                $data['external_bank_name'] ?? null,
                $data['external_account_number'] ?? null
            ]);
            // Return item with new ID
            $data['id'] = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'data' => $data]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }

    } else {
        $stmt = $pdo->query("SELECT * FROM exchange_transactions ORDER BY date DESC");
        echo json_encode($stmt->fetchAll());
    }
} elseif ($action === 'delete_transaction') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'] ?? null;

        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM exchange_transactions WHERE id = ?");
            // Reverse balance before deleting
            $txStmt = $pdo->prepare("SELECT * FROM exchange_transactions WHERE id = ?");
            $txStmt->execute([$id]);
            $tx = $txStmt->fetch();

            if ($tx && $tx['payment_method'] === 'bank' && $tx['bank_account_id']) {
                if ($tx['type'] === 'buy') {
                    // Was Buy (Deducted), now Add back
                    $rup = $pdo->prepare("UPDATE bank_accounts SET balance = balance + ? WHERE id = ?");
                    $rup->execute([$tx['total_local'], $tx['bank_account_id']]);
                } elseif ($tx['type'] === 'sell') {
                    // Was Sell (Added), now Deduct
                    $rup = $pdo->prepare("UPDATE bank_accounts SET balance = balance - ? WHERE id = ?");
                    $rup->execute([$tx['total_local'], $tx['bank_account_id']]);
                }
            }

            if ($stmt->execute([$id])) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to delete']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'No ID provided']);
        }
    }
} else {
    echo json_encode([]);
}
?>