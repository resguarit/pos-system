<?php

namespace App\Http\Controllers;

use App\Interfaces\RoleServiceInterface;
use App\Interfaces\PermissionServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    protected $roleService;
    protected $permissionService;

    public function __construct(RoleServiceInterface $roleService, PermissionServiceInterface $permissionService)
    {
        $this->roleService = $roleService;
        $this->permissionService = $permissionService;
    }

    public function index(): JsonResponse
    {
        $roles = \App\Models\Role::withCount('permissions')->get();
        $roles = $roles->map(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
                'permissions_count' => $role->permissions_count,
                'is_system' => $role->is_system ?? false,
            ];
        });
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Roles obtenidos correctamente',
            'data' => $roles
        ], 200);
    }

    public function show($id): JsonResponse
    {
        try {
            $role = \App\Models\Role::withCount('permissions')->findOrFail($id);
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Rol obtenido correctamente',
                'data' => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'description' => $role->description,
                    'permissions_count' => $role->permissions_count,
                    'is_system' => $role->is_system ?? false,
                    'active' => $role->active ?? true,
                    'created_at' => $role->created_at,
                    'updated_at' => $role->updated_at,
                    'deleted_at' => $role->deleted_at,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Rol no encontrado'
            ], 404);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'description' => 'nullable|string|max:500'
        ]);

        try {
            $role = $this->roleService->createRole($validatedData);
            // Volver a consultar el rol con withCount y mapear
            $role = \App\Models\Role::withCount('permissions')->findOrFail($role->id);
            $mapped = [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
                'permissions_count' => $role->permissions_count,
                'is_system' => $role->is_system ?? false,
                'active' => $role->active ?? true,
                'created_at' => $role->created_at,
                'updated_at' => $role->updated_at,
                'deleted_at' => $role->deleted_at,
            ];
            return response()->json([
                'status' => 201,
                'success' => true,
                'message' => 'Rol creado correctamente',
                'data' => $mapped
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al crear el rol: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        // Verificar si es el rol Admin antes de permitir cambios
        $role = \App\Models\Role::findOrFail($id);
        
        if (strtolower($role->name) === 'admin') {
            return response()->json([
                'status' => 403,
                'success' => false,
                'message' => 'El rol Admin no puede ser modificado'
            ], 403);
        }

        $validatedData = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,' . $id,
            'description' => 'nullable|string|max:500'
        ]);

        try {
            $this->roleService->updateRole($id, $validatedData);
            $role = \App\Models\Role::withCount('permissions')->findOrFail($id);
            $mapped = [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
                'permissions_count' => $role->permissions_count,
                'is_system' => $role->is_system ?? false,
                'active' => $role->active ?? true,
                'created_at' => $role->created_at,
                'updated_at' => $role->updated_at,
                'deleted_at' => $role->deleted_at,
            ];
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Rol actualizado correctamente',
                'data' => $mapped
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al actualizar el rol: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        // Verificar si es el rol Admin antes de permitir eliminación
        $role = \App\Models\Role::findOrFail($id);
        
        if (strtolower($role->name) === 'admin') {
            return response()->json([
                'status' => 403,
                'success' => false,
                'message' => 'El rol Admin no puede ser eliminado'
            ], 403);
        }

        try {
            $deleted = $this->roleService->deleteRole($id);
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Rol eliminado correctamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al eliminar el rol: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getPermissionsCountByRole(Request $request): JsonResponse
    {
        $query = \App\Models\Role::withCount('permissions');

        // Agregar filtro de búsqueda si está presente
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('description', 'like', "%$search%");
            });
        }

        // Paginación
        $perPage = $request->get('limit', 10);
        $roles = $query->paginate($perPage);

        $rolesData = $roles->map(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
                'permissions_count' => $role->permissions_count,
                'is_system' => $role->is_system ?? false,
            ];
        });

        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Conteo de permisos por rol obtenido correctamente',
            'data' => $rolesData,
            'total' => $roles->total(),
            'current_page' => $roles->currentPage(),
            'last_page' => $roles->lastPage(),
            'per_page' => $roles->perPage(),
            'from' => $roles->firstItem(),
            'to' => $roles->lastItem(),
        ]);
    }

    public function getRolePermissions($id): JsonResponse
    {
        try {
            $permissions = $this->permissionService->getPermissionsByRoleId($id);
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Permisos del rol obtenidos correctamente',
                'data' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'No se pudieron obtener los permisos del rol: ' . $e->getMessage(),
                'data' => []
            ], 404);
        }
    }

    public function setRolePermissions(Request $request, $id): JsonResponse
    {
        $validatedData = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,id'
        ]);

        try {
            $this->permissionService->setPermissionsForRole($id, $validatedData['permissions']);
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Permisos del rol actualizados correctamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al actualizar los permisos del rol: ' . $e->getMessage()
            ], 500);
        }
    }

    public function checkName($name): JsonResponse
    {
        try {
            $exists = $this->roleService->checkNameExists($name);
            
            return response()->json([
                'exists' => $exists
            ]);
        } catch (\Exception $e) {
            \Log::error('Error checking role name: ' . $e->getMessage());
            return response()->json([
                'exists' => false
            ], 500);
        }
    }
}
