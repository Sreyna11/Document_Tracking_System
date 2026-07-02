<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Department;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AccountController extends Controller
{
    private function uploadBase64ToS3($base64String, $folder, $username)
    {
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

        return url('/api/documents/file/' . $filename);
    }

    public function index()
    {
        $users = User::with(['department', 'assignedRoles'])->get()->map(function ($user) {
            return [
                'id' => $user->user_id,
                'username' => $user->username,
                'fullname_kh' => $user->fullname_kh,
                'fullname_en' => $user->fullname_en,
                'phone' => $user->phone,
                'email' => $user->email,
                'mainRole' => $user->department ? $user->department->name : null,
                'department' => $user->department ? $user->department->name : null,
                'role' => $user->role,
                'type' => $user->type,
                'profilePhoto' => $user->profile_photo,
                'signaturePhoto' => $user->signature_photo,
                'status' => $user->is_active ? 'Active' : 'Inactive'
            ];
        });

        return response()->json($users);
    }

    public function show(string $id)
    {
        $user = User::with(['department', 'assignedRoles'])->findOrFail($id);
        
        return response()->json([
            'id' => $user->user_id,
            'fullname_kh' => $user->fullname_kh,
            'fullname_en' => $user->fullname_en,
            'phone' => $user->phone,
            'email' => $user->email,
            'mainRole' => $user->department ? $user->department->name : null,
            'department' => $user->department ? $user->department->name : null,
            'role' => $user->role,
            'type' => $user->type,
            'profilePhoto' => $user->profile_photo,
            'signaturePhoto' => $user->signature_photo,
            'status' => $user->is_active ? 'Active' : 'Inactive'
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'fullname_kh' => 'required|string',
            'fullname_en' => 'required|string',
            'phone' => 'required|string',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'department' => 'required|string',
            'role' => 'required|string',
            'type' => 'nullable|string',
            'profilePhoto' => 'nullable|string',
            'signaturePhoto' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        $department = Department::where('name', $validated['department'])->first();
        $role = Role::where('name', $validated['role'])
            ->when($department, function($q) use ($department) {
                return $q->where('department_id', $department->department_id);
            })->first();

        $user = User::create([
            'username' => trim($validated['fullname_en']),
            'fullname_kh' => $validated['fullname_kh'],
            'fullname_en' => $validated['fullname_en'],
            'phone' => $validated['phone'],
            'email' => $validated['email'],
            'password_hash' => Hash::make($validated['password']),
            'department_id' => $department ? $department->department_id : null,
            'role' => $validated['role'] ?? null,
            'type' => $validated['type'] ?? null,
            'profile_photo' => $this->uploadBase64ToS3($validated['profilePhoto'] ?? null, 'avatars', $validated['fullname_en']),
            'signature_photo' => $this->uploadBase64ToS3($validated['signaturePhoto'] ?? null, 'signatures', $validated['fullname_en']),
            'is_active' => ($validated['status'] ?? 'Active') === 'Active' ? true : false,
        ]);

        if ($role && $department) {
            setPermissionsTeamId($department->department_id);
            $user->assignRole($role);
        }

        return response()->json(['message' => 'User created successfully', 'user_id' => $user->user_id]);
    }

    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'fullname_kh' => 'required|string',
            'fullname_en' => 'required|string',
            'phone' => 'required|string',
            'email' => 'required|email|unique:users,email,' . $id . ',user_id',
            'password' => 'nullable|string|min:6',
            'department' => 'required|string',
            'role' => 'required|string',
            'type' => 'nullable|string',
            'profilePhoto' => 'nullable|string',
            'signaturePhoto' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        $department = Department::where('name', $validated['department'])->first();
        $role = Role::where('name', $validated['role'])
            ->when($department, function($q) use ($department) {
                return $q->where('department_id', $department->department_id);
            })->first();

        $updateData = [
            'username' => trim($validated['fullname_en']),
            'fullname_kh' => $validated['fullname_kh'],
            'fullname_en' => $validated['fullname_en'],
            'phone' => $validated['phone'],
            'email' => $validated['email'],
            'department_id' => $department ? $department->department_id : null,
            'role' => $validated['role'] ?? null,
            'type' => $validated['type'] ?? null,
            'profile_photo' => $this->uploadBase64ToS3($validated['profilePhoto'] ?? null, 'avatars', $validated['fullname_en']),
            'signature_photo' => $this->uploadBase64ToS3($validated['signaturePhoto'] ?? null, 'signatures', $validated['fullname_en']),
            'is_active' => ($validated['status'] ?? 'Active') === 'Active' ? true : false,
        ];

        if (!empty($validated['password'])) {
            $updateData['password_hash'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        \App\Models\AuditLog::create([
            'document_id' => null,
            'user_id' => $user->user_id,
            'action' => 'Profile Updated',
            'action_details' => json_encode([
                'method' => 'Web App',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'updated_by' => $request->user() ? $request->user()->username : $user->username,
                'updated_fields' => array_keys($validated)
            ])
        ]);

        if ($role && $department) {
            setPermissionsTeamId($department->department_id);
            $user->syncRoles([$role]);
        }

        return response()->json(['message' => 'User updated successfully']);
    }

    public function destroy(string $id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    public function generateTelegramToken(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Generate a random 32-character token
        $token = bin2hex(random_bytes(16));
        
        $user->telegram_link_token = $token;
        $user->save();

        return response()->json([
            'token' => $token,
            'bot_username' => env('TELEGRAM_BOT_USERNAME', 'MyDocTrackingBot')
        ]);
    }
}
