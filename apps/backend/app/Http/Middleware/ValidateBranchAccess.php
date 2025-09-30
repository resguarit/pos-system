<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ValidateBranchAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        
        // Si no hay usuario autenticado, continuar (esto lo maneja el middleware auth)
        if (!$user) {
            return $next($request);
        }

        // Los administradores tienen acceso a todas las sucursales
        if ($user->role && $user->role->name === 'Admin') {
            return $next($request);
        }

        // Obtener branch_id del request (puede venir en diferentes lugares)
        $branchId = $this->getBranchIdFromRequest($request);
        
        // Si no se especifica sucursal, continuar
        if (!$branchId) {
            return $next($request);
        }

        // Verificar si el usuario tiene acceso a esta sucursal
        $userBranchIds = $user->branches()->pluck('branches.id')->toArray();
        
        if (!in_array($branchId, $userBranchIds)) {
            return response()->json([
                'status' => 403,
                'success' => false,
                'message' => 'No tienes acceso a esta sucursal',
                'data' => null
            ], 403);
        }

        return $next($request);
    }

    /**
     * Extraer branch_id del request desde diferentes fuentes
     */
    private function getBranchIdFromRequest(Request $request): ?int
    {
        // 1. Parámetro de ruta
        if ($request->route('branch') || $request->route('branch_id')) {
            return (int) ($request->route('branch') ?? $request->route('branch_id'));
        }

        // 2. Query parameters
        if ($request->has('branch_id')) {
            return (int) $request->get('branch_id');
        }

        if ($request->has('branch')) {
            return (int) $request->get('branch');
        }

        // 3. Request body (para POST/PUT)
        if ($request->has('branch_id')) {
            return (int) $request->input('branch_id');
        }

        if ($request->has('branch')) {
            return (int) $request->input('branch');
        }

        // 4. Headers (para casos especiales)
        if ($request->header('X-Branch-ID')) {
            return (int) $request->header('X-Branch-ID');
        }

        return null;
    }
}
