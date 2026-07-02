<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$user = App\Models\User::whereNotNull('signature_photo')->first();
if ($user) {
    $sig = $user->signaturePhoto ?? $user->signature_photo;
    echo substr($sig, 0, 50) . PHP_EOL;
} else {
    echo "No user with signature found.";
}
