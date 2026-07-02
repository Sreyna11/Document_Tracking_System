<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Storage;

try {
    echo "Checking file...\n";
    $exists = Storage::disk('s3')->exists('signed/Material Purchase Request_1782659692.pdf');
    echo "Exists: " . ($exists ? "Yes" : "No") . "\n";
} catch (\Exception $e) {
    echo "Exception: " . get_class($e) . "\n";
    echo "Message: " . $e->getMessage() . "\n";
    if ($e->getPrevious()) {
        echo "Previous: " . get_class($e->getPrevious()) . "\n";
        echo "Prev Message: " . $e->getPrevious()->getMessage() . "\n";
    }
}
