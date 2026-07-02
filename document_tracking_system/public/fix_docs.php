<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$docs = App\Models\Document::where('status', 'Completed')->get();
foreach ($docs as $doc) {
    $meta = json_decode($doc->metadata, true);
    if (isset($meta['files'][0]['name']) && isset($meta['files'][0]['stored_name'])) {
        if ($meta['files'][0]['name'] !== $meta['files'][0]['stored_name']) {
            if (strpos($meta['files'][0]['name'], '_signed_') !== false) {
                $meta['files'][0]['stored_name'] = $meta['files'][0]['name'];
                $doc->metadata = json_encode($meta);
                $doc->save();
                echo 'Fixed doc ' . $doc->document_number . PHP_EOL;
            }
        }
    }
}
echo 'Done';
