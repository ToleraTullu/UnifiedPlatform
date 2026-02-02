<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_connect.php';

$action = $_GET['action'] ?? '';

if ($action === 'list') {
    // Get all accounts
    $stmt = $pdo->query("SELECT * FROM bank_accounts");
    echo json_encode($stmt->fetchAll());

} elseif ($action === 'add') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);

        // Validation
        if (empty($data['bank_name']) || empty($data['account_number'])) {
            echo json_encode(['success' => false, 'message' => 'Missing required fields']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO bank_accounts (bank_name, account_number, account_holder, sectors, balance, min_balance_threshold) VALUES (?, ?, ?, ?, ?, ?)");
        try {
            $stmt->execute([
                $data['bank_name'],
                $data['account_number'],
                $data['account_holder'] ?? '',
                $data['sectors'] ?? 'all',
                $data['balance'] ?? 0.00,
                $data['min_balance_threshold'] ?? 0.00
            ]);
            $data['id'] = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'data' => $data]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

} elseif ($action === 'transfer') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);

        $fromId = $data['from_account_id'];
        $toId = $data['to_account_id'];
        $amount = (float) $data['amount'];

        if (!$fromId || !$toId || $amount <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid transfer details']);
            exit;
        }

        try {
            $pdo->beginTransaction();

            // Check sufficient funds
            $stmtCheck = $pdo->prepare("SELECT balance FROM bank_accounts WHERE id = ?");
            $stmtCheck->execute([$fromId]);
            $fromAcc = $stmtCheck->fetch();

            if (!$fromAcc || $fromAcc['balance'] < $amount) {
                throw new Exception("Insufficient funds");
            }

            // Deduct from sender
            $stmtDeduct = $pdo->prepare("UPDATE bank_accounts SET balance = balance - ? WHERE id = ?");
            $stmtDeduct->execute([$amount, $fromId]);

            // Add to receiver
            $stmtAdd = $pdo->prepare("UPDATE bank_accounts SET balance = balance + ? WHERE id = ?");
            $stmtAdd->execute([$amount, $toId]);

            // Log transfer
            $stmtName = $pdo->prepare("SELECT bank_name FROM bank_accounts WHERE id = ?");
            $stmtName->execute([$fromId]);
            $fromName = $stmtName->fetchColumn() ?: 'Unknown Bank';

            $stmtName->execute([$toId]);
            $toName = $stmtName->fetchColumn() ?: 'Unknown Bank';

            $logStmt = $pdo->prepare("INSERT INTO activity_logs (action_type, module_name, details, performed_by, created_at) VALUES (?, ?, ?, ?, NOW())");
            $details = "Transferred $" . number_format($amount, 2) . " from $fromName to $toName";
            // We assume 'system' or 'admin' for now as we don't have session user here easily without auth check, 
            // but we can try to pass it or just say 'System/Admin'.
            $logStmt->execute(['TRANSFER', 'BANKING', $details, 'Admin']);

            $pdo->commit();
            echo json_encode(['success' => true]);

        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
} elseif ($action === 'update_balance') {
    // Admin manual update or specific adjustment
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!empty($data['id']) && isset($data['balance'])) {
            $stmt = $pdo->prepare("UPDATE bank_accounts SET balance = ? WHERE id = ?");
            if ($stmt->execute([$data['balance'], $data['id']])) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to update']);
            }
        }
    }

} elseif ($action === 'delete') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'] ?? null;

        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM bank_accounts WHERE id = ?");
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
    echo json_encode(['success' => false, 'message' => 'Invalid Action']);
}
?>