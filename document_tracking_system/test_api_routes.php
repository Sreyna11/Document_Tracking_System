<?php

$baseUrl = 'http://document_tracking_system.test/api';
$docNum = 'REQ-7';

$loginData = json_encode(['email' => 'admin@admin.com', 'password' => 'password']);

$opts = [
    "http" => [
        "method" => "POST",
        "header" => "Content-Type: application/json\r\nAccept: application/json\r\n",
        "content" => $loginData
    ]
];

$context = stream_context_create($opts);
$res = @file_get_contents("$baseUrl/login", false, $context);
$token = json_decode($res, true)['token'];

$opts = [
    "http" => [
        "method" => "GET",
        "header" => "Accept: application/json\r\nAuthorization: Bearer $token\r\n"
    ]
];

$context = stream_context_create($opts);

echo "Testing /documents/$docNum/approvals\n";
$res = @file_get_contents("$baseUrl/documents/$docNum/approvals", false, $context);
echo $res . "\n";

echo "\nTesting /documents/$docNum/versions\n";
$res = @file_get_contents("$baseUrl/documents/$docNum/versions", false, $context);
echo $res . "\n";

echo "\nTesting /documents/$docNum/access\n";
$res = @file_get_contents("$baseUrl/documents/$docNum/access", false, $context);
echo $res . "\n";
