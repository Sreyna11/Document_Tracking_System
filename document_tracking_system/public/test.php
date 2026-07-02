<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
$doc = \App\Models\Document::with('documentTag.tag')->where('document_id', 14)->first();
echo "METADATA:\n";
var_dump(json_decode($doc->metadata, true)['tag'] ?? null);
echo "\nDOCUMENT TAG REL:\n";
var_dump($doc->documentTag->toArray());
if ($doc->documentTag->isNotEmpty() && $doc->documentTag->first()->tag) {
    echo "\nTAG NAME: " . $doc->documentTag->first()->tag->name;
} else {
    echo "\nNO TAG REL FOUND!";
}
