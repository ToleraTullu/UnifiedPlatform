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

        $stmt = $pdo->prepare("INSERT INTO bank_accounts (bank_name, account_number, account_holder, sectors) VALUES (?, ?, ?, ?)");
        try {
            $stmt->execute([
                $data['bank_name'],
                $data['account_number'],
                $data['account_holder'] ?? '',
                $data['sectors'] ?? 'all'
            ]);
            $data['id'] = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'data' => $data]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
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