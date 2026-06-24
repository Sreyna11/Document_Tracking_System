<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$u = App\Models\User::firstOrCreate(['email' => 'admin@rupp.edu.kh']);
$u->username = 'System Admin';
$u->password_hash = password_hash('admin1234', PASSWORD_BCRYPT);
$u->type = 'Super Admin';
$u->save();

echo "ADMIN SET\n";
