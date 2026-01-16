<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_connect.php';

$action = $_GET['action'] ?? '';

if ($action === 'list') {
    // Only return safe fields
    $stmt = $pdo->query("SELECT id, username, role, name, created_at FROM users");
    echo json_encode($stmt->fetchAll());

} elseif ($action === 'add') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['username']) || empty($data['password'])) {
            echo json_encode(['success' => false, 'message' => 'Missing fields']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)");
        try {
            $stmt->execute([
                $data['username'],
                $data['password'], // In real app, hash this!
                $data['role'] ?? 'exchange_user',
                $data['name'] ?? 'Staff Member'
            ]);
            $data['id'] = $pdo->lastInsertId();
            unset($data['password']); // Don't return password
            echo json_encode($data);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
} elseif ($action === 'delete') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            if ($stmt->execute([$id])) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to delete']);
            }
        }
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid Action']);
}
?>