<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Storage;

echo "Testing MinIO connection...\n";

try {
    $filename = 'test_minio_upload_' . time() . '.txt';
    $content = 'This is a test file to verify MinIO storage integration.';
    
    // Test write
    echo "Writing to S3 disk...\n";
    $putResult = Storage::disk('s3')->put($filename, $content);
    
    if ($putResult) {
        echo "Successfully wrote $filename to MinIO!\n";
    } else {
        echo "Failed to write file.\n";
        exit(1);
    }
    
    // Test read
    echo "Reading from S3 disk...\n";
    $readContent = Storage::disk('s3')->get($filename);
    
    if ($readContent === $content) {
        echo "Successfully read content: $readContent\n";
    } else {
        echo "Failed to read content, or content mismatched.\n";
    }

} catch (\Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
}
