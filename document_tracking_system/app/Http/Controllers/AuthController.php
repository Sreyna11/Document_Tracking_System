<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use App\Models\User;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'username' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
        ]);

        $defaultRole = \App\Models\Role::first();
        $defaultDept = \App\Models\Department::first();

        $user = User::create([
            'username' => $request->username,
            'full_name' => $request->username,
            'email' => $request->email,
            'password_hash' => Hash::make($request->password),
            'department_id' => $defaultDept ? $defaultDept->department_id : null,
            'role' => $defaultRole ? $defaultRole->name : null,
            'is_active' => true,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        if ($defaultRole && $user->department_id) {
            setPermissionsTeamId($user->department_id);
            $user->assignRole($defaultRole);
        }

        return response()->json([
            'token' => $token,
            'user' => $user->load('assignedRoles', 'department')
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // Create a unique key based on the email and IP address
        $throttleKey = Str::lower($request->email) . '|' . $request->ip();

        // Check if the user has exceeded the maximum number of login attempts (5 times)
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => 'លោកអ្នកបានវាយខុសលើស ៥ ដងហើយ។ សូមរង់ចាំ ' . $seconds . ' វិនាទីទៀតទើបអាចសាកល្បងម្ដងទៀតបាន។'
            ], 429);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            // Record a failed attempt
            RateLimiter::hit($throttleKey, 60); // 60 seconds (1 minute) lockout

            $attemptsLeft = RateLimiter::retriesLeft($throttleKey, 5);
            $msg = 'អុីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ។ (នៅសល់ ' . $attemptsLeft . ' ដងទៀត)';
            
            return response()->json([
                'message' => $msg
            ], 401);
        }

        // Clear the rate limiter upon successful login
        RateLimiter::clear($throttleKey);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->load('assignedRoles', 'department')
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()->load('assignedRoles', 'department')
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }
}
