<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
$request = \Illuminate\Http\Request::create('/api/accounts', 'GET');
$response = app()->handle($request);
echo $response->getContent();
