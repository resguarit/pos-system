<?php

namespace App\Http\Controllers;

use App\Interfaces\BranchServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BranchController extends Controller
{
    protected $branchService;

    public function __construct(BranchServiceInterface $branchService)
    {
        $this->branchService = $branchService;
    }

    public function index(): JsonResponse
    {
        // Verificar permiso de ver sucursales
        $user = auth()->user();
        $hasPermission = $user->role
            ->permissions()
            ->where('name', 'ver_sucursales')
            ->exists();

        if (!$hasPermission) {
            return response()->json([
                'status' => 403,
                'success' => false,
                'message' => 'No tienes permiso para ver sucursales'
            ], 403);
        }

        $branches = $this->branchService->getAllBranches();
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Sucursales obtenidas correctamente',
            'data' => $branches
        ], 200);
    }

    public function create(): JsonResponse
    {
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Formulario de creación de sucursal cargado correctamente'
        ], 200);
    }

    public function show($id): JsonResponse
    {
        // Verificar permiso de ver sucursales
        $user = auth()->user();
        $hasPermission = $user->role
            ->permissions()
            ->where('name', 'ver_sucursales')
            ->exists();

        if (!$hasPermission) {
            return response()->json([
                'status' => 403,
                'success' => false,
                'message' => 'No tienes permiso para ver sucursales'
            ], 403);
        }

        $branch = $this->branchService->getBranchById($id);
        if (!$branch) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Sucursal no encontrada'
            ], 404);
        }
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Sucursal obtenida correctamente',
            'data' => $branch
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        // Verificar permiso de crear sucursales
        $user = auth()->user();
        $hasPermission = $user->role
            ->permissions()
            ->where('name', 'crear_sucursales')
            ->exists();

        if (!$hasPermission) {
            return response()->json([
                'status' => 403,
                'success' => false,
                'message' => 'No tienes permiso para crear sucursales'
            ], 403);
        }

        $validatedData = $request->validate([
            'description' => 'required|string|max:255',
            'address' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'point_of_sale' => 'nullable|string|max:255',
            'manager_id' => 'nullable|exists:users,id',
            'status' => 'boolean',
            'color' => 'string|max:7|regex:/^#[0-9A-F]{6}$/i'
        ]);
        
        $validatedData['status'] = $request->input('status', true);

        $branch = $this->branchService->createBranch($validatedData);
        return response()->json([
            'status' => 201,
            'success' => true,
            'message' => 'Sucursal creada correctamente',
            'data' => $branch
        ], 201);
    }

    public function edit($id): JsonResponse
    {
        $branch = $this->branchService->getBranchById($id);
        if (!$branch) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Sucursal no encontrada'
            ], 404);
        }
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Formulario de edición de sucursal cargado correctamente',
            'data' => $branch
        ], 200);
    }

    public function update(Request $request, $id): JsonResponse
    {
        // Verificar permiso de editar sucursales
        $user = auth()->user();
        $hasPermission = $user->role
            ->permissions()
            ->where('name', 'editar_sucursales')
            ->exists();

        if (!$hasPermission) {
            return response()->json([
                'status' => 403,
                'success' => false,
                'message' => 'No tienes permiso para editar sucursales'
            ], 403);
        }

        $validatedData = $request->validate([
            'description' => 'string|max:255',
            'address' => 'string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'point_of_sale' => 'nullable|string|max:255',
            'manager_id' => 'nullable|exists:users,id',
            'status' => 'boolean',
            'color' => 'string|max:7|regex:/^#[0-9A-F]{6}$/i'
        ]);

        $branch = $this->branchService->updateBranch($id, $validatedData);
        if (!$branch) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Sucursal no encontrada'
            ], 404);
        }
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Sucursal actualizada correctamente',
            'data' => $branch
        ], 200);
    }

    public function destroy($id): JsonResponse
    {
        // Verificar permiso de eliminar sucursales
        $user = auth()->user();
        $hasPermission = $user->role
            ->permissions()
            ->where('name', 'eliminar_sucursales')
            ->exists();

        if (!$hasPermission) {
            return response()->json([
                'status' => 403,
                'success' => false,
                'message' => 'No tienes permiso para eliminar sucursales'
            ], 403);
        }

        $result = $this->branchService->deleteBranch($id);
        if (!$result) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Sucursal no encontrada'
            ], 404);
        }
        return response()->json([
            'status' => 204,
            'success' => true,
            'message' => 'Sucursal eliminada correctamente'
        ], 204);
    }

    public function active(): JsonResponse
    {
        $branches = $this->branchService->getActiveBranches();
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Sucursales activas obtenidas correctamente',
            'data' => $branches
        ], 200);
    }

    public function personnel($id): JsonResponse
    {
        // Verificar permiso de ver personal de sucursales
        $user = auth()->user();
        $hasPermission = $user->role
            ->permissions()
            ->where('name', 'ver_personal_sucursal')
            ->exists();

        if (!$hasPermission) {
            return response()->json([
                'status' => 403,
                'success' => false,
                'message' => 'No tienes permiso para ver el personal de sucursales'
            ], 403);
        }

        $personnel = $this->branchService->getBranchPersonnel($id);
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Personal de sucursal obtenido correctamente',
            'data' => $personnel
        ], 200);
    }

    public function checkName($name): JsonResponse
    {
        try {
            $exists = $this->branchService->checkNameExists($name);
            
            return response()->json([
                'exists' => $exists
            ]);
        } catch (\Exception $e) {
            \Log::error('Error checking branch name: ' . $e->getMessage());
            return response()->json([
                'exists' => false
            ], 500);
        }
    }
}
