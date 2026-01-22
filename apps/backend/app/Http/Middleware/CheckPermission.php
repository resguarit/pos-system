<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$permissions  One or more permission names (OR logic)
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Si no se especifican permisos, solo requiere autenticación
        if (empty($permissions)) {
            return $next($request);
        }

        // Check if user has any of the required permissions (OR logic)
        foreach ($permissions as $permissionString) {
            $permissionOptions = explode('|', $permissionString);
            foreach ($permissionOptions as $permission) {
                if ($user->hasPermission($permission)) {
                    return $next($request);
                }
            }
        }

        return response()->json([
            'message' => 'No tienes permiso para realizar esta acción.',
            'required_permissions' => $permissions
        ], 403);
    }
}
