<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'data_store.php';

$action = $_GET['action'] ?? '';
$store = new DataStore();

if ($action === 'sites') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $item = json_decode(file_get_contents("php://input"), true);
        echo json_encode($store->add('construction_sites', $item));
    } else {
        echo json_encode($store->get('construction_sites'));
    }
} elseif ($action === 'expenses') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $item = json_decode(file_get_contents("php://input"), true);
        echo json_encode($store->add('construction_expenses', $item));
    } else {
        echo json_encode($store->get('construction_expenses'));
    }
} elseif ($action === 'income') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $item = json_decode(file_get_contents("php://input"), true);
        echo json_encode($store->add('construction_income', $item));
    } else {
        echo json_encode($store->get('construction_income'));
    }
} else {
    echo json_encode([]);
}
?>