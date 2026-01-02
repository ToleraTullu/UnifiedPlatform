<?php
// api/data_store.php

// Ensure data directory exists
$dataDir = __DIR__ . '/../data';
if (!file_exists($dataDir)) {
    mkdir($dataDir, 0777, true);
}

function getJsonData($filename) {
    global $dataDir;
    $path = $dataDir . '/' . $filename . '.json';
    if (!file_exists($path)) {
        return [];
    }
    $json = file_get_contents($path);
    return json_decode($json, true) ?? [];
}

function saveJsonData($filename, $data) {
    global $dataDir;
    $path = $dataDir . '/' . $filename . '.json';
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT));
}

// Send JSON Response
function sendResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Handle CORS (simulated)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit; // Preflight
}
?>
