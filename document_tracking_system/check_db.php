<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$doc = \App\Models\Document::orderBy('created_at', 'desc')->first();
echo "Metadata: " . $doc->metadata . "\n";
echo "Versions: " . \App\Models\DocumentVersion::where('document_id', $doc->document_id)->count() . "\n";
