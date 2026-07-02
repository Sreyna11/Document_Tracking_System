<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;

$user = User::where('username', 'Sreyly')->first();
echo "Sreyly's Profile Photo: " . $user->profile_photo . "\n";
echo "Sreyly's Signature Photo: " . $user->signature_photo . "\n";
