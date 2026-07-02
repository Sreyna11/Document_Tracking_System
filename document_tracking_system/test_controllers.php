<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$reqNum = 'REQ-1782414952';

$approvalController = new \App\Http\Controllers\DocumentApprovalController();
echo "Approvals:\n";
echo json_encode($approvalController->index($reqNum)->getData(), JSON_PRETTY_PRINT);

echo "\n\nVersions:\n";
$versionController = new \App\Http\Controllers\DocumentVersionController();
echo json_encode($versionController->index($reqNum)->getData(), JSON_PRETTY_PRINT);

echo "\n\nAccess:\n";
$accessController = new \App\Http\Controllers\DocumentAccessController();
echo json_encode($accessController->index($reqNum)->getData(), JSON_PRETTY_PRINT);
