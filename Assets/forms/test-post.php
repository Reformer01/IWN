<?php
// Simple test to verify POST requests work
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(200);
    echo json_encode(['status' => true, 'message' => 'OPTIONS OK']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    echo json_encode([
        'status' => true,
        'message' => 'POST request successful',
        'received' => $_POST,
        'method' => $_SERVER['REQUEST_METHOD']
    ]);
} else {
    echo json_encode([
        'status' => false,
        'message' => 'Expected POST, got ' . $_SERVER['REQUEST_METHOD']
    ]);
}
