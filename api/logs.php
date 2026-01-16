<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_connect.php';

$action = $_GET['action'] ?? '';

if ($action === 'list') {
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
    $stmt = $pdo->prepare("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT :limit");
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    echo json_encode($stmt->fetchAll());

} elseif ($action === 'add') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);

        $stmt = $pdo->prepare("INSERT INTO activity_logs (action_type, module_name, details, performed_by, created_at) VALUES (?, ?, ?, ?, ?)");

        try {
            $stmt->execute([
                $data['action_type'],
                $data['module_name'],
                $data['details'],
                $data['performed_by'] ?? 'system',
                $data['created_at'] ?? date('Y-m-d H:i:s')
            ]);
            $data['id'] = $pdo->lastInsertId();
            echo json_encode($data);
        } catch (PDOException $e) {
            // Table might not exist yet?
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid Action']);
}
?>