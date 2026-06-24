<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Department;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class AccountController extends Controller
{
    public function index()
    {
        $users = User::with(['department', 'role'])->get()->map(function ($user) {
            return [
                'id' => $user->user_id,
                'fullname_kh' => $user->fullname_kh,
                'fullname_en' => $user->fullname_en,
                'phone' => $user->phone,
                'email' => $user->email,
                'mainRole' => $user->department ? $user->department->name : null,
                'department' => $user->department ? $user->department->name : null,
                'role' => $user->role ? $user->role->role_name : null,
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
        $user = User::with(['department', 'role'])->findOrFail($id);
        
        return response()->json([
            'id' => $user->user_id,
            'fullname_kh' => $user->fullname_kh,
            'fullname_en' => $user->fullname_en,
            'phone' => $user->phone,
            'email' => $user->email,
            'mainRole' => $user->department ? $user->department->name : null,
            'department' => $user->department ? $user->department->name : null,
            'role' => $user->role ? $user->role->role_name : null,
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
        $role = Role::where('role_name', $validated['role'])
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
            'role_id' => $role ? $role->role_id : null,
            'type' => $validated['type'] ?? null,
            'profile_photo' => $validated['profilePhoto'] ?? null,
            'signature_photo' => $validated['signaturePhoto'] ?? null,
            'is_active' => ($validated['status'] ?? 'Active') === 'Active' ? true : false,
        ]);

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
        $role = Role::where('role_name', $validated['role'])
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
            'role_id' => $role ? $role->role_id : null,
            'type' => $validated['type'] ?? null,
            'profile_photo' => $validated['profilePhoto'] ?? null,
            'signature_photo' => $validated['signaturePhoto'] ?? null,
            'is_active' => ($validated['status'] ?? 'Active') === 'Active' ? true : false,
        ];

        if (!empty($validated['password'])) {
            $updateData['password_hash'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        return response()->json(['message' => 'User updated successfully']);
    }

    public function destroy(string $id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }
}
