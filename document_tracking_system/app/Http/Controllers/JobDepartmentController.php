<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Department;
use App\Models\Role;

class JobDepartmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $departments = Department::with('roles')->get()->map(function ($dept) {
            return [
                'id' => $dept->department_id,
                'title' => $dept->name,
                'code' => $dept->code,
                'campusSuite' => $dept->campus_suite,
                'userSignature' => $dept->user_signature,
                'description' => $dept->description,
                'status' => $dept->status,
                'roles' => $dept->roles->map(function ($role) {
                    return [
                        'id' => $role->role_id,
                        'title' => $role->role_name,
                        'slug' => $role->slug,
                        'level' => $role->level,
                        'type' => $role->type,
                        'coreFunction' => $role->description,
                    ];
                })
            ];
        });

        return response()->json($departments);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'code' => 'required|string',
            'campusSuite' => 'nullable|string',
            'userSignature' => 'nullable|string',
            'description' => 'nullable|string',
            'status' => 'nullable|string',
            'roles' => 'nullable|array',
        ]);

        $department = Department::create([
            'name' => $validated['title'],
            'code' => $validated['code'],
            'campus_suite' => $validated['campusSuite'] ?? null,
            'user_signature' => $validated['userSignature'] ?? null,
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'Active',
        ]);

        if (!empty($validated['roles'])) {
            foreach ($validated['roles'] as $roleData) {
                $newRole = $department->roles()->create([
                    'role_name' => $roleData['title'],
                    'slug' => $roleData['slug'] ?? null,
                    'level' => $roleData['level'] ?? null,
                    'type' => $roleData['type'] ?? null,
                    'description' => $roleData['coreFunction'] ?? null,
                    'permissions' => [] // Will be populated below
                ]);
                
                // Inherit permissions if type exists
                if (!empty($roleData['type'])) {
                    $deptPermissions = is_string($department->role_permissions) ? json_decode($department->role_permissions, true) : ($department->role_permissions ?? []);
                    if (isset($deptPermissions[$roleData['type']])) {
                        $newRole->update(['permissions' => $deptPermissions[$roleData['type']]]);
                    }
                }
            }
        }

        return response()->json(['message' => 'Department created successfully', 'department_id' => $department->department_id]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $department = Department::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string',
            'code' => 'required|string',
            'campusSuite' => 'nullable|string',
            'userSignature' => 'nullable|string',
            'description' => 'nullable|string',
            'status' => 'nullable|string',
            'roles' => 'nullable|array',
        ]);

        $department->update([
            'name' => $validated['title'],
            'code' => $validated['code'],
            'campus_suite' => $validated['campusSuite'] ?? null,
            'user_signature' => $validated['userSignature'] ?? null,
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'Active',
        ]);

        // Sync roles
        // We delete roles that are not in the payload and update/create the rest.
        // For simplicity, since the frontend sends the full array, we can delete missing ones.
        if (isset($validated['roles'])) {
            $existingRoleIds = $department->roles()->pluck('role_id')->toArray();
            $incomingRoleIds = array_filter(array_column($validated['roles'], 'id'), 'is_numeric');

            $rolesToDelete = array_diff($existingRoleIds, $incomingRoleIds);
            if (!empty($rolesToDelete)) {
                Role::whereIn('role_id', $rolesToDelete)->delete();
            }

            foreach ($validated['roles'] as $roleData) {
                if (isset($roleData['id']) && is_numeric($roleData['id'])) {
                    $role = Role::find($roleData['id']);
                    if ($role) {
                        $role->update([
                            'role_name' => $roleData['title'],
                            'slug' => $roleData['slug'] ?? null,
                            'level' => $roleData['level'] ?? null,
                            'type' => $roleData['type'] ?? null,
                            'description' => $roleData['coreFunction'] ?? null,
                        ]);
                    }
                } else {
                    $newRole = $department->roles()->create([
                        'role_name' => $roleData['title'],
                        'slug' => $roleData['slug'] ?? null,
                        'level' => $roleData['level'] ?? null,
                        'type' => $roleData['type'] ?? null,
                        'description' => $roleData['coreFunction'] ?? null,
                        'permissions' => [] // Will be populated below
                    ]);
                    
                    // Inherit permissions if type exists
                    if (!empty($roleData['type'])) {
                        $deptPermissions = is_string($department->role_permissions) ? json_decode($department->role_permissions, true) : ($department->role_permissions ?? []);
                        if (isset($deptPermissions[$roleData['type']])) {
                            $newRole->update(['permissions' => $deptPermissions[$roleData['type']]]);
                        }
                    }
                }
            }
        } else {
            $department->roles()->delete();
        }

        return response()->json(['message' => 'Department updated successfully']);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $department = Department::findOrFail($id);
        $department->roles()->delete(); // Roles might cascade, but explicit is fine
        $department->delete();

        return response()->json(['message' => 'Department deleted successfully']);
    }
}
