<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_connect.php';

$action = $_GET['action'] ?? '';

if ($action === 'list') {
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
    $module = $_GET['module'] ?? '';
    $type = $_GET['action_type'] ?? '';

    $sql = "SELECT * FROM activity_logs WHERE 1=1";
    $params = [];

    if (!empty($module)) {
        $sql .= " AND module_name = :module";
        $params[':module'] = $module;
    }
    if (!empty($type)) {
        $sql .= " AND action_type = :type";
        $params[':type'] = $type;
    }

    $sql .= " ORDER BY created_at DESC LIMIT :limit";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }

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
                isset($data['created_at']) ? date('Y-m-d H:i:s', strtotime($data['created_at'])) : date('Y-m-d H:i:s')
            ]);
            $data['id'] = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'data' => $data]);
        } catch (PDOException $e) {
            // Table might not exist yet?
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid Action']);
}
?>