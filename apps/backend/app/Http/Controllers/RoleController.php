<?php

namespace App\Http\Controllers;

use App\Interfaces\RoleServiceInterface;
use App\Interfaces\PermissionServiceInterface;
use App\Services\ScheduleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    protected $roleService;
    protected $permissionService;
    protected ScheduleService $scheduleService;

    public function __construct(RoleServiceInterface $roleService, PermissionServiceInterface $permissionService, ScheduleService $scheduleService)
    {
        $this->roleService = $roleService;
        $this->permissionService = $permissionService;
        $this->scheduleService = $scheduleService;
    }

    public function index(): JsonResponse
    {
        $roles = \App\Models\Role::withCount('permissions')->get();

        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Roles obtenidos correctamente',
            'data' => \App\Http\Resources\RoleResource::collection($roles)
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
                'data' => new \App\Http\Resources\RoleResource($role)
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
            'description' => 'nullable|string|max:500',
            'single_session_only' => 'nullable|boolean',
            'access_schedule' => 'nullable|array',
            'access_schedule.enabled' => 'nullable|boolean',
            'access_schedule.timezone' => 'nullable|string',
            'access_schedule.days' => 'nullable|array',
            'access_schedule.days.*' => 'integer|min:1|max:7',
            'access_schedule.start_time' => ['nullable', 'string', 'regex:/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/'],
            'access_schedule.end_time' => ['nullable', 'string', 'regex:/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/']
        ]);

        // Validar schedule adicional si está habilitado
        if (isset($validatedData['access_schedule'])) {
            $scheduleErrors = $this->scheduleService->validateSchedule($validatedData['access_schedule']);
            if (!empty($scheduleErrors)) {
                return response()->json([
                    'status' => 422,
                    'success' => false,
                    'message' => 'Error en la configuración de horario',
                    'errors' => $scheduleErrors
                ], 422);
            }
        }

        try {
            $role = $this->roleService->createRole($validatedData);
            // Volver a consultar el rol con withCount y mapear
            $role = \App\Models\Role::withCount('permissions')->findOrFail($role->id);

            return response()->json([
                'status' => 201,
                'success' => true,
                'message' => 'Rol creado correctamente',
                'data' => new \App\Http\Resources\RoleResource($role)
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
            'description' => 'nullable|string|max:500',
            'single_session_only' => 'nullable|boolean',
            'access_schedule' => 'nullable|array',
            'access_schedule.enabled' => 'nullable|boolean',
            'access_schedule.timezone' => 'nullable|string',
            'access_schedule.days' => 'nullable|array',
            'access_schedule.days.*' => 'integer|min:1|max:7',
            'access_schedule.start_time' => ['nullable', 'string', 'regex:/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/'],
            'access_schedule.end_time' => ['nullable', 'string', 'regex:/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/']
        ]);

        // Validar schedule adicional si está habilitado
        if (isset($validatedData['access_schedule'])) {
            $scheduleErrors = $this->scheduleService->validateSchedule($validatedData['access_schedule']);
            if (!empty($scheduleErrors)) {
                return response()->json([
                    'status' => 422,
                    'success' => false,
                    'message' => 'Error en la configuración de horario',
                    'errors' => $scheduleErrors
                ], 422);
            }
        }

        try {
            $this->roleService->updateRole($id, $validatedData);
            $role = \App\Models\Role::withCount('permissions')->findOrFail($id);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Rol actualizado correctamente',
                'data' => new \App\Http\Resources\RoleResource($role)
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
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                    ->orWhere('description', 'like', "%$search%");
            });
        }

        // Paginación
        $perPage = $request->get('limit', 10);
        $roles = $query->paginate($perPage);

        // Usar resource collection para la paginación, preservando la estructura de paginación
        // pero transformando los items usando el Resource
        // Usamos resolve() para obtener el array limpio, ya que estamos metiéndolo dentro de 'data' manualmente
        $rolesResource = \App\Http\Resources\RoleResource::collection($roles)->resolve();

        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Conteo de permisos por rol obtenido correctamente',
            'data' => $rolesResource,
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
