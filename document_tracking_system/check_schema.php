<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$columns = Illuminate\Support\Facades\Schema::getColumns('document_approvals');
foreach ($columns as $col) {
    if ($col['name'] === 'approver_id') {
        echo json_encode($col);
    }
}
