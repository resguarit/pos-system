<?php

namespace App\Http\Controllers;

use App\Services\UserService;
use Illuminate\Http\Response;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\User;

class UserController extends Controller
{
    protected $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }

    public function index(Request $request)
    {
        try {
            $search = $request->get('search');
            $roleId = $request->get('role_id');
            $status = $request->get('status');
            $perPage = $request->get('limit', 10); // Cambiar per_page por limit para consistencia
            
            // Construir la consulta base - excluir usuarios ocultos
            $query = User::with(['person', 'role', 'branches'])
                         ->where('hidden', false);
            
            // Aplicar filtros
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('email', 'like', "%{$search}%")
                      ->orWhereHas('person', function ($subQ) use ($search) {
                          $subQ->where('first_name', 'like', "%{$search}%")
                               ->orWhere('last_name', 'like', "%{$search}%");
                      });
                });
            }
            
            if ($roleId && $roleId !== 'all') {
                $query->where('role_id', $roleId);
            }
            
            if ($status && $status !== 'all') {
                $active = $status === 'active';
                $query->where('active', $active);
            }
            
            // Usar paginación estándar
            $users = $query->paginate($perPage);
            
            // Formatear la respuesta para consistencia
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Usuarios obtenidos correctamente',
                'data' => $users->items(),
                'total' => $users->total(),
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'from' => $users->firstItem(),
                'to' => $users->lastItem(),
            ], 200);
            
        } catch (\Exception $e) {
            Log::error('Error in UserController@index: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    public function show($id)
    {
        $user = \App\Models\User::with(['branches', 'person'])->find($id);
        if (!$user) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }
        return response()->json($user);
    }

    public function store(Request $request)
    {
        try {
            $user = $this->userService->createUser($request->all());
            return response()->json($user, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $user = $this->userService->updateUser($id, $request->all());
            return response()->json($user);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function destroy($id)
    {
        try {
            $deleted = $this->userService->deleteUser($id);
            if ($deleted) {
                return response()->json(['message' => 'Usuario eliminado correctamente']);
            } else {
                return response()->json(['message' => 'Usuario no encontrado'], 404);
            }
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function userBranches($id)
    {
        $result = $this->userService->getUserBranches((int)$id);
        return response()->json($result);
    }

    public function updateUserBranches(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $branchIds = $request->input('branch_ids', []);
        $user->branches()->sync($branchIds); // Actualiza la relación en branch_user
        return response()->json(['message' => 'Sucursales actualizadas']);
    }

    // Obtener sucursales asignadas a un usuario
    public function getUserBranches($id)
    {
        $user = \App\Models\User::findOrFail($id);
        return $user->branches; // Devuelve las sucursales completas
    }

    // Obtener sucursales del usuario autenticado
    public function getMyBranches(Request $request)
    {
        $user = $request->user();
        $branches = $user->branches()->select('branches.id', 'branches.description as name', 'branches.address', 'branches.phone')->get();
        return response()->json($branches);
    }

    // Obtener información del usuario autenticado con sus permisos
    public function getProfile(Request $request)
    {
        $user = $request->user();
        $user->load(['person', 'role.permissions', 'branches']);
        
        // Obtener todos los permisos del usuario (a través de su único rol)
        $permissions = $user->role && $user->role->permissions
            ? $user->role->permissions->pluck('name')->unique()->values()
            : collect();

        // Formatear las sucursales del usuario
        $branches = $user->branches->map(function ($branch) {
            return [
                'id' => (string) $branch->id,
                'description' => $branch->description,
                'address' => $branch->address,
                'phone' => $branch->phone,
                'email' => $branch->email,
                'color' => $branch->color,
                'status' => $branch->status,
                'point_of_sale' => $branch->point_of_sale,
            ];
        });

        return response()->json([
            'user' => [
                'id' => (string) $user->id,
                'email' => $user->email,
                'username' => $user->username,
                'active' => $user->active,
                'person' => $user->person ? [
                    'id' => $user->person->id,
                    'first_name' => $user->person->first_name,
                    'last_name' => $user->person->last_name,
                    'documento' => $user->person->documento ?? null,
                    'cuit' => $user->person->cuit ?? null,
                ] : null,
                'role' => $user->role ? [
                    'id' => $user->role->id,
                    'name' => $user->role->name,
                    'description' => $user->role->description ?? null,
                    'is_system' => $user->role->is_system ?? false,
                ] : null,
                'branches' => $branches,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ],
            'permissions' => $permissions
        ]);
    }

    public function checkUsername($username): JsonResponse
    {
        try {
            $exists = $this->userService->checkUsernameExists($username);
            
            return response()->json([
                'exists' => $exists
            ]);
        } catch (\Exception $e) {
            \Log::error('Error checking username: ' . $e->getMessage());
            return response()->json([
                'exists' => false
            ], 500);
        }
    }

    public function checkEmail($email): JsonResponse
    {
        try {
            $exists = $this->userService->checkEmailExists($email);
            
            return response()->json([
                'exists' => $exists
            ]);
        } catch (\Exception $e) {
            \Log::error('Error checking email: ' . $e->getMessage());
            return response()->json([
                'exists' => false
            ], 500);
        }
    }
}
