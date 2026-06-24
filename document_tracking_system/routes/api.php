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

// Example of how to protect a route using the new middleware:
// Route::get('/documents', [DocumentController::class, 'index'])
//     ->middleware(['auth:sanctum', 'permission:Request,View']);



