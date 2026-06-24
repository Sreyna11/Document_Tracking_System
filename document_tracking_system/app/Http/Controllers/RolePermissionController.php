<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Department;
use Illuminate\Http\Request;

class RolePermissionController extends Controller
{
    /**
     * Get the structure of roles to build the UI sidebar.
     * Return fixed Role Types ('Super Admin', 'Admin', 'Staff') for each department.
     */
    public function getDepartmentsAndRoles()
    {
        $departments = Department::all();
        
        $response = $departments->map(function ($dept) {
            return [
                'name' => $dept->name,
                'roles' => ['Super Admin', 'Admin', 'Staff']
            ];
        });

        return response()->json($response);
    }

    /**
     * Get permissions for a specific role type in a department
     */
    public function getPermissions(Request $request)
    {
        $request->validate([
            'department' => 'required|string',
            'type' => 'required|string',
        ]);

        $departmentName = $request->query('department');
        $type = $request->query('type');

        $dept = Department::where('name', $departmentName)->first();
        if (!$dept) {
            return response()->json(['message' => 'Department not found'], 404);
        }

        $allPermissions = is_string($dept->role_permissions) ? json_decode($dept->role_permissions, true) : ($dept->role_permissions ?? []);
        
        return response()->json([
            'permissions' => $allPermissions[$type] ?? (object)[]
        ]);
    }

    /**
     * Update permissions for a specific role type in a department
     *
     * @param Request $request
     * @param array<string, array<string, boolean>> $request->permissions The permissions object mapping menus to actions.
     */
    public function updatePermissions(Request $request)
    {
        $request->validate([
            'department' => 'required|string',
            'type' => 'required|string',
            'permissions' => 'required|array',
        ]);

        $dept = Department::where('name', $request->department)->first();
        if (!$dept) {
            return response()->json(['message' => 'Department not found'], 404);
        }

        $allPermissions = is_string($dept->role_permissions) ? json_decode($dept->role_permissions, true) : ($dept->role_permissions ?? []);
        $allPermissions[$request->type] = $request->input('permissions');

        $dept->role_permissions = $allPermissions;
        $dept->save();

        // Cascade permissions to all existing roles of this type in this department
        Role::where('department_id', $dept->department_id)
            ->where('type', $request->type)
            ->update(['permissions' => json_encode($request->input('permissions'))]);

        return response()->json([
            'message' => 'Permissions updated successfully',
            'permissions' => $request->input('permissions')
        ]);
    }
}
