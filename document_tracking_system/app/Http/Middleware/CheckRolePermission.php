<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRolePermission
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $menu, string $action): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Global super admin bypass if needed, but standard hasPermission check handles it
        // based on the role permissions they defined.
        if (!$user->hasPermission($menu, $action)) {
            return response()->json([
                'message' => 'Forbidden: You do not have permission to ' . $action . ' ' . $menu . '.'
            ], 403);
        }

        return $next($request);
    }
}
