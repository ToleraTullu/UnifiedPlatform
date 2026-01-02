<?php
require_once 'data_store.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Generic Handler for Sites, Expenses, Income
$validActions = ['sites', 'expenses', 'income'];

if (in_array($action, $validActions)) {
    $filename = 'construction_' . $action;

    if ($method === 'GET') {
        $data = getJsonData($filename);
        sendResponse($data);
    } elseif ($method === 'POST') {
        $newItem = json_decode(file_get_contents('php://input'), true);
        $list = getJsonData($filename);

        $newItem['id'] = time();
        if (!isset($newItem['date']))
            $newItem['date'] = date('c');

        $list[] = $newItem;
        saveJsonData($filename, $list);
        sendResponse(['success' => true]);
    }
}
?>