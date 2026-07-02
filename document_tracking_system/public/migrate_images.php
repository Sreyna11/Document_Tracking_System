<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

echo "Starting data migration for base64 images...\n";

function migrateBase64ToS3($base64String, $folder, $username) {
    if (!$base64String || !str_contains($base64String, ';base64,')) {
        return $base64String;
    }

    @list($type, $file_data) = explode(';', $base64String);
    @list(, $file_data) = explode(',', $file_data);
    $file_data = base64_decode($file_data);

    $extension = 'png';
    if (str_contains($type, 'jpeg') || str_contains($type, 'jpg')) $extension = 'jpg';
    elseif (str_contains($type, 'gif')) $extension = 'gif';
    elseif (str_contains($type, 'svg')) $extension = 'svg';

    $filename = $folder . '/' . Str::slug($username) . '_' . time() . '.' . $extension;
    
    Storage::disk('s3')->put($filename, $file_data);

    return env('AWS_ENDPOINT') . '/' . env('AWS_BUCKET') . '/' . $filename;
}

$users = User::all();
$migratedCount = 0;

foreach ($users as $user) {
    $updated = false;
    
    // Migrate Profile Photo
    if (str_contains($user->profile_photo, ';base64,')) {
        $newUrl = migrateBase64ToS3($user->profile_photo, 'avatars', $user->username ?: $user->fullname_en ?: 'user');
        $user->profile_photo = $newUrl;
        $updated = true;
        echo "Migrated profile photo for user: {$user->username}\n";
    }

    // Migrate Signature Photo
    if (str_contains($user->signature_photo, ';base64,')) {
        $newUrl = migrateBase64ToS3($user->signature_photo, 'signatures', $user->username ?: $user->fullname_en ?: 'user');
        $user->signature_photo = $newUrl;
        $updated = true;
        echo "Migrated signature photo for user: {$user->username}\n";
    }

    if ($updated) {
        $user->save();
        $migratedCount++;
    }
}

echo "Migration completed! Updated $migratedCount users.\n";
