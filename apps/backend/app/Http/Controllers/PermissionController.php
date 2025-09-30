<?php

namespace App\Http\Controllers;

use App\Interfaces\PermissionServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    protected $permissionService;

    public function __construct(PermissionServiceInterface $permissionService)
    {
        $this->permissionService = $permissionService;
    }

    public function index(): JsonResponse
    {
        $permissions = $this->permissionService->getAllPermissions();
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Permisos obtenidos correctamente',
            'data' => $permissions
        ], 200);
    }
}
