<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_connect.php';

$action = $_GET['action'] ?? '';

if ($action === 'login') {
    // Read JSON Body
    $data = json_decode(file_get_contents("php://input"));
    $username = $data->username ?? '';
    $password = $data->password ?? '';

    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Username and Password required']);
        exit;
    }

    // Query Database
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    // Verify Password (Plaintext for now as per schema/user request)
    // NOTE: In production, use password_verify($password, $user['password'])
    if ($user && $password === $user['password']) {
        // Remove password from response
        unset($user['password']);
        echo json_encode(['success' => true, 'user' => $user]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid Credentials']);
    }

} else {
    echo json_encode(['success' => false, 'message' => 'Invalid Action']);
}
?>