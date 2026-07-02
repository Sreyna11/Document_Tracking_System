<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;

$users = User::all();
$count = 0;

foreach ($users as $user) {
    $updated = false;
    
    if ($user->profile_photo && str_contains($user->profile_photo, '/document-tracking/document-tracking/')) {
        $user->profile_photo = str_replace('/document-tracking/document-tracking/', '/document-tracking/', $user->profile_photo);
        $updated = true;
    }

    if ($user->signature_photo && str_contains($user->signature_photo, '/document-tracking/document-tracking/')) {
        $user->signature_photo = str_replace('/document-tracking/document-tracking/', '/document-tracking/', $user->signature_photo);
        $updated = true;
    }

    if ($updated) {
        $user->save();
        $count++;
    }
}

echo "Fixed $count users' URLs.\n";
