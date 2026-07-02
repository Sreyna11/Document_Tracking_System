<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\RolePermissionController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\JobDepartmentController;
use App\Http\Controllers\AccountController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
});

Route::get('/departments', [RolePermissionController::class, 'getDepartmentsAndRoles']);
Route::get('/permissions', [RolePermissionController::class, 'getPermissions']);
Route::post('/permissions', [RolePermissionController::class, 'updatePermissions']);

Route::apiResource('job-departments', JobDepartmentController::class);
Route::apiResource('accounts', AccountController::class);
Route::apiResource('document-types', \App\Http\Controllers\DocumentTypeController::class);
Route::get('/documents/file/{filename}', [\App\Http\Controllers\DocumentController::class, 'getFile'])
    ->where('filename', '.*');

// Telegram Webhook (No auth required, called by Telegram servers)
Route::post('/telegram/webhook', [\App\Http\Controllers\TelegramWebhookController::class, 'handle']);

Route::apiResource('documents', \App\Http\Controllers\DocumentController::class)->middleware('auth:sanctum');
Route::post('/documents/{id}/sign', [\App\Http\Controllers\DocumentSignatureController::class, 'sign'])->middleware('auth:sanctum');
Route::post('/documents/{filename}/convert-to-pdf', [\App\Http\Controllers\DocumentController::class, 'convertToPdf'])
    ->middleware('auth:sanctum')
    ->where('filename', '.*');
Route::apiResource('notifications', \App\Http\Controllers\NotificationController::class)->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/telegram/generate-token', [\App\Http\Controllers\AccountController::class, 'generateTelegramToken']);
    Route::get('/admin/dashboard-stats', [\App\Http\Controllers\AdminController::class, 'getDashboardStats']);
    Route::get('/documents/{document}/approvals', [\App\Http\Controllers\DocumentApprovalController::class, 'index']);
    Route::get('/documents/{document}/versions', [\App\Http\Controllers\DocumentVersionController::class, 'index']);
    Route::get('/documents/{document}/access', [\App\Http\Controllers\DocumentAccessController::class, 'index']);
    Route::post('/documents/{document}/log-action', [\App\Http\Controllers\DocumentController::class, 'logAction']);
});
// Example of how to protect a route using the new middleware:
// Route::get('/documents', [DocumentController::class, 'index'])
//     ->middleware(['auth:sanctum', 'permission:Request,View']);



