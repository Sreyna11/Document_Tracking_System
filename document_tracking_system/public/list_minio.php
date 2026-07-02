<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Storage;

echo "Listing contents of MinIO Bucket:\n";
$allFiles = Storage::disk('s3')->allFiles();
foreach($allFiles as $file) {
    echo "- $file\n";
}
