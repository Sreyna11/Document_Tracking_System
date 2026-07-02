<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$departments = \App\Models\Department::all()->toArray();
$users = \App\Models\User::all()->toArray();
file_put_contents('dump.json', json_encode(['departments' => $departments, 'users' => $users]));
echo "Done";
