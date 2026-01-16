<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_connect.php';

$action = $_GET['action'] ?? '';

if ($action === 'sites') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $pdo->prepare("INSERT INTO construction_sites (name, location, status) VALUES (?, ?, ?)");
        try {
            $stmt->execute([
                $data['name'],
                $data['location'] ?? '',
                $data['status'] ?? 'Active'
            ]);
            $data['id'] = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'data' => $data]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    } else {
        $stmt = $pdo->query("SELECT * FROM construction_sites");
        echo json_encode($stmt->fetchAll());
    }
} elseif ($action === 'expenses') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $pdo->prepare("INSERT INTO construction_expenses (site_id, description, amount, date, payment_method, bank_account_id, external_bank_name, external_account_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        try {
            $stmt->execute([
                $data['site_id'],
                $data['description'],
                $data['amount'],
                $data['date'],
                $data['payment_method'] ?? 'cash',
                $data['bank_account_id'] ?? null,
                $data['external_bank_name'] ?? null,
                $data['external_account_number'] ?? null
            ]);
            $data['id'] = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'data' => $data]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    } else {
        $stmt = $pdo->query("SELECT * FROM construction_expenses ORDER BY date DESC");
        echo json_encode($stmt->fetchAll());
    }
} elseif ($action === 'income') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $pdo->prepare("INSERT INTO construction_income (site_id, description, amount, date, payment_method, bank_account_id) VALUES (?, ?, ?, ?, ?, ?)");
        try {
            $stmt->execute([
                $data['site_id'],
                $data['description'],
                $data['amount'],
                $data['date'],
                $data['payment_method'] ?? 'cash',
                $data['bank_account_id'] ?? null
            ]);
            $data['id'] = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'data' => $data]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    } else {
        $stmt = $pdo->query("SELECT * FROM construction_income ORDER BY date DESC");
        echo json_encode($stmt->fetchAll());
    }
} else {
    echo json_encode([]);
}
?>