<?php

namespace App\Http\Controllers;

use App\Services\UserService;
use App\Services\SaleService;
use Illuminate\Http\Response;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use Carbon\Carbon;

class UserController extends Controller
{
    protected $userService;
    protected $saleService;

    public function __construct(UserService $userService, SaleService $saleService)
    {
        $this->userService = $userService;
        $this->saleService = $saleService;
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
        $result = $this->userService->getUserBranches((int) $id);
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

    public function checkName($firstName, $lastName): JsonResponse
    {
        try {
            $exists = $this->userService->checkNameExists($firstName, $lastName);

            return response()->json([
                'exists' => $exists
            ]);
        } catch (\Exception $e) {
            \Log::error('Error checking user name: ' . $e->getMessage());
            return response()->json([
                'exists' => false
            ], 500);
        }
    }

    /**
     * Obtener historial de ventas por usuario
     */
    public function getUserSales(Request $request, $id)
    {
        try {
            // Verificar permisos
            $currentUser = auth()->user();
            if (!$currentUser) {
                return response()->json([
                    'status' => 401,
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Los administradores tienen acceso completo
            $isAdmin = $currentUser->role && $currentUser->role->name === 'Admin';

            if (!$isAdmin) {
                // Verificar si el usuario tiene el permiso ver_ventas_usuario
                $hasPermission = $currentUser->role
                    ->permissions()
                    ->where('name', 'ver_ventas_usuario')
                    ->exists();

                if (!$hasPermission) {
                    return response()->json([
                        'status' => 403,
                        'success' => false,
                        'message' => 'No tienes permiso para ver el historial de ventas de usuarios'
                    ], 403);
                }
            }

            $user = User::with('person')->findOrFail($id);

            // Parámetros de filtrado
            $fromDate = $request->input('from_date');
            $toDate = $request->input('to_date');
            $branchIds = $request->input('branch_id');
            $perPage = $request->input('per_page', 10);
            $page = $request->input('page', 1);

            // Construir query base
            $query = \App\Models\SaleHeader::with([
                'receiptType',
                'branch',
                'customer.person',
                'items.product',
                'saleIvas'
            ])->where('user_id', $id);

            // Aplicar filtros de fecha
            if ($fromDate) {
                $query->whereDate('date', '>=', Carbon::parse($fromDate)->startOfDay());
            }
            if ($toDate) {
                $query->whereDate('date', '<=', Carbon::parse($toDate)->endOfDay());
            }

            // Aplicar filtro de sucursales
            if ($branchIds) {
                if (is_array($branchIds)) {
                    if (count($branchIds) > 0) {
                        $query->whereIn('branch_id', $branchIds);
                    }
                } else {
                    $query->where('branch_id', $branchIds);
                }
            }

            // Ordenar por fecha descendente
            $query->orderByDesc('date');

            // Paginación
            $sales = $query->paginate($perPage, ['*'], 'page', $page);

            // Formatear datos de respuesta
            $formattedSales = $sales->getCollection()->map(function ($sale) {
                $customerName = '';
                if ($sale->customer && $sale->customer->person) {
                    $customerName = trim($sale->customer->person->first_name . ' ' . $sale->customer->person->last_name);
                } elseif ($sale->customer && $sale->customer->business_name) {
                    $customerName = $sale->customer->business_name;
                } else {
                    $customerName = 'Consumidor Final';
                }

                $receiptTypeName = $sale->receiptType ? $sale->receiptType->description : 'N/A';
                $receiptTypeCode = $sale->receiptType ? $sale->receiptType->afip_code ?? '' : '';

                return [
                    'id' => $sale->id,
                    'date' => $sale->date ? Carbon::parse($sale->date)->format('Y-m-d H:i:s') : '',
                    'date_display' => $sale->date ? Carbon::parse($sale->date)->format('d/m/Y H:i') : '',
                    'receipt_type_id' => $sale->receipt_type_id,
                    'receipt_type' => $receiptTypeName,
                    'receipt_type_code' => $receiptTypeCode,
                    'receipt_number' => $sale->receipt_number ?? '',
                    'customer' => $customerName,
                    'customer_id' => $sale->customer_id,
                    'items_count' => $sale->items->count(),
                    'cae' => $sale->cae,
                    'cae_expiration_date' => $sale->cae_expiration_date ? Carbon::parse($sale->cae_expiration_date)->format('Y-m-d') : '',
                    'subtotal' => (float) $sale->subtotal,
                    'total' => (float) $sale->total,
                    'total_iva_amount' => (float) $sale->total_iva_amount,
                    'status' => $sale->status ?? 'Completada',
                    'annulled_at' => $sale->annulled_at ? Carbon::parse($sale->annulled_at)->format('Y-m-d H:i:s') : null,
                    'annulled_by' => $sale->annulled_by,
                    'annulment_reason' => $sale->annulment_reason,
                    'branch' => $sale->branch ? $sale->branch->description : 'N/A',
                    'branch_id' => $sale->branch_id,
                ];
            });

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Ventas del usuario obtenidas correctamente',
                'data' => $formattedSales,
                'pagination' => [
                    'current_page' => $sales->currentPage(),
                    'last_page' => $sales->lastPage(),
                    'per_page' => $sales->perPage(),
                    'total' => $sales->total(),
                    'from' => $sales->firstItem(),
                    'to' => $sales->lastItem(),
                ],
                'user' => [
                    'id' => $user->id,
                    'name' => $user->person ? trim($user->person->first_name . ' ' . $user->person->last_name) : $user->username,
                    'email' => $user->email,
                    'username' => $user->username,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in UserController@getUserSales: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de ventas por usuario
     */
    public function getUserSalesStatistics(Request $request, $id)
    {
        try {
            // Verificar permisos
            $currentUser = auth()->user();
            if (!$currentUser) {
                return response()->json([
                    'status' => 401,
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Los administradores tienen acceso completo
            $isAdmin = $currentUser->role && $currentUser->role->name === 'Admin';

            if (!$isAdmin) {
                // Verificar si el usuario tiene el permiso ver_estadisticas_usuario
                $hasPermission = $currentUser->role
                    ->permissions()
                    ->where('name', 'ver_estadisticas_usuario')
                    ->exists();

                if (!$hasPermission) {
                    return response()->json([
                        'status' => 403,
                        'success' => false,
                        'message' => 'No tienes permiso para ver estadísticas de usuarios'
                    ], 403);
                }
            }

            $user = User::with('person')->findOrFail($id);

            // Parámetros de filtrado
            $fromDate = $request->input('from_date');
            $toDate = $request->input('to_date');
            $branchIds = $request->input('branch_id');

            // Construir query base
            $query = \App\Models\SaleHeader::with('receiptType')
                ->where('user_id', $id);

            // Aplicar filtros de fecha
            if ($fromDate) {
                $query->whereDate('date', '>=', Carbon::parse($fromDate)->startOfDay());
            }
            if ($toDate) {
                $query->whereDate('date', '<=', Carbon::parse($toDate)->endOfDay());
            }

            // Aplicar filtro de sucursales
            if ($branchIds) {
                if (is_array($branchIds)) {
                    if (count($branchIds) > 0) {
                        $query->whereIn('branch_id', $branchIds);
                    }
                } else {
                    $query->where('branch_id', $branchIds);
                }
            }

            $allSales = $query->get();

            // Filtrar presupuestos y ventas anuladas para estadísticas financieras
            $financialSales = $allSales->filter(function ($sale) {
                return !($sale->receiptType && $sale->receiptType->afip_code === '016') &&
                    $sale->status !== 'annulled';
            });

            // Estadísticas básicas
            $totalSales = $financialSales->count();
            $totalAmount = $financialSales->sum('total');
            $totalIva = $financialSales->sum('total_iva_amount');
            $averageSaleAmount = $totalSales > 0 ? $totalAmount / $totalSales : 0;

            // Estadísticas por tipo de comprobante
            $salesByReceiptType = $financialSales->groupBy('receipt_type_id')
                ->map(function ($group) {
                    $receiptType = $group->first()->receiptType;
                    return [
                        'receipt_type' => $receiptType ? $receiptType->description : 'N/A',
                        'count' => $group->count(),
                        'total_amount' => $group->sum('total'),
                        'average_amount' => $group->count() > 0 ? $group->sum('total') / $group->count() : 0,
                    ];
                })->values();

            // Estadísticas por sucursal
            $salesByBranch = $financialSales->groupBy('branch_id')
                ->map(function ($group) {
                    $branch = $group->first()->branch;
                    return [
                        'branch_id' => $group->first()->branch_id,
                        'branch_name' => $branch ? $branch->description : 'N/A',
                        'count' => $group->count(),
                        'total_amount' => $group->sum('total'),
                        'average_amount' => $group->count() > 0 ? $group->sum('total') / $group->count() : 0,
                    ];
                })->values();

            // Estadísticas por período (últimos 30 días)
            $last30Days = $financialSales->filter(function ($sale) {
                return $sale->date >= Carbon::now()->subDays(30);
            });

            $last30DaysStats = [
                'count' => $last30Days->count(),
                'total_amount' => $last30Days->sum('total'),
                'average_amount' => $last30Days->count() > 0 ? $last30Days->sum('total') / $last30Days->count() : 0,
            ];

            // Estadísticas por período (últimos 7 días)
            $last7Days = $financialSales->filter(function ($sale) {
                return $sale->date >= Carbon::now()->subDays(7);
            });

            $last7DaysStats = [
                'count' => $last7Days->count(),
                'total_amount' => $last7Days->sum('total'),
                'average_amount' => $last7Days->count() > 0 ? $last7Days->sum('total') / $last7Days->count() : 0,
            ];

            // Estadísticas de presupuestos
            $budgetSales = $allSales->filter(function ($sale) {
                return $sale->receiptType && $sale->receiptType->afip_code === '016';
            });

            $budgetStats = [
                'count' => $budgetSales->count(),
                'total_amount' => $budgetSales->sum('total'),
                'average_amount' => $budgetSales->count() > 0 ? $budgetSales->sum('total') / $budgetSales->count() : 0,
            ];

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Estadísticas del usuario obtenidas correctamente',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->person ? trim($user->person->first_name . ' ' . $user->person->last_name) : $user->username,
                        'email' => $user->email,
                        'username' => $user->username,
                    ],
                    'summary' => [
                        'total_sales' => $totalSales,
                        'total_amount' => (float) $totalAmount,
                        'total_iva' => (float) $totalIva,
                        'average_sale_amount' => (float) $averageSaleAmount,
                        'budget_count' => $budgetStats['count'],
                        'budget_total_amount' => (float) $budgetStats['total_amount'],
                    ],
                    'period_stats' => [
                        'last_7_days' => [
                            'count' => $last7DaysStats['count'],
                            'total_amount' => (float) $last7DaysStats['total_amount'],
                            'average_amount' => (float) $last7DaysStats['average_amount'],
                        ],
                        'last_30_days' => [
                            'count' => $last30DaysStats['count'],
                            'total_amount' => (float) $last30DaysStats['total_amount'],
                            'average_amount' => (float) $last30DaysStats['average_amount'],
                        ],
                    ],
                    'by_receipt_type' => $salesByReceiptType,
                    'by_branch' => $salesByBranch,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in UserController@getUserSalesStatistics: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtiene las ventas diarias de un usuario para gráficos
     */
    public function getUserDailySales(Request $request, $id)
    {
        try {
            // Verificar permisos
            $currentUser = auth()->user();
            if (!$currentUser) {
                return response()->json([
                    'status' => 401,
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Los administradores tienen acceso completo
            $isAdmin = $currentUser->role && $currentUser->role->name === 'Admin';

            if (!$isAdmin) {
                // Verificar si el usuario tiene el permiso ver_estadisticas_usuario
                $hasPermission = $currentUser->role
                    ->permissions()
                    ->where('name', 'ver_estadisticas_usuario')
                    ->exists();

                if (!$hasPermission) {
                    return response()->json([
                        'status' => 403,
                        'success' => false,
                        'message' => 'No tienes permiso para ver estadísticas de usuarios'
                    ], 403);
                }
            }

            // Verificar que el usuario existe
            $user = \App\Models\User::find($id);
            if (!$user) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ], 404);
            }

            $query = \App\Models\SaleHeader::where('user_id', $id)
                ->where('status', '!=', 'annulled');

            // Filtros
            if ($request->has('from_date') && $request->from_date) {
                $query->whereDate('date', '>=', $request->from_date);
            }
            if ($request->has('to_date') && $request->to_date) {
                $query->whereDate('date', '<=', $request->to_date);
            }
            if ($request->has('branch_id') && $request->branch_id) {
                $query->where('branch_id', $request->branch_id);
            }

            // Agrupar por fecha y calcular totales
            $dailySales = $query->selectRaw('DATE(date) as date, COUNT(*) as sales_count, COALESCE(SUM(total), 0) as total_amount')
                ->groupByRaw('DATE(date)')
                ->orderByRaw('DATE(date)')
                ->get();

            return response()->json($dailySales);

        } catch (\Exception $e) {
            Log::error('Error in UserController@getUserDailySales: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener ventas mensuales del usuario
     */
    public function getUserMonthlySales(Request $request, $id)
    {
        try {
            // Verificar permisos
            $currentUser = auth()->user();
            if (!$currentUser) {
                return response()->json([
                    'status' => 401,
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Los administradores tienen acceso completo
            $isAdmin = $currentUser->role && $currentUser->role->name === 'Admin';

            if (!$isAdmin) {
                // Verificar si el usuario tiene el permiso ver_estadisticas_usuario
                $hasPermission = $currentUser->role
                    ->permissions()
                    ->where('name', 'ver_estadisticas_usuario')
                    ->exists();

                if (!$hasPermission) {
                    return response()->json([
                        'status' => 403,
                        'success' => false,
                        'message' => 'No tienes permiso para ver estadísticas de usuarios'
                    ], 403);
                }
            }

            // Verificar que el usuario existe
            $user = \App\Models\User::find($id);
            if (!$user) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ], 404);
            }

            $query = \App\Models\SaleHeader::where('user_id', $id)
                ->where('status', '!=', 'annulled');

            // Filtros
            if ($request->has('from_date') && $request->from_date) {
                $query->whereDate('date', '>=', $request->from_date);
            }
            if ($request->has('to_date') && $request->to_date) {
                $query->whereDate('date', '<=', $request->to_date);
            }
            if ($request->has('branch_id') && $request->branch_id) {
                $query->where('branch_id', $request->branch_id);
            }

            // Agrupar por mes y año, calcular totales
            $monthlySales = $query->selectRaw('
                YEAR(date) as year,
                MONTH(date) as month,
                DATE_FORMAT(date, "%Y-%m") as month_key,
                COUNT(*) as sales_count,
                COALESCE(SUM(total), 0) as total_amount
            ')
                ->groupByRaw('YEAR(date), MONTH(date), DATE_FORMAT(date, "%Y-%m")')
                ->orderByRaw('YEAR(date), MONTH(date)')
                ->get();

            return response()->json($monthlySales);

        } catch (\Exception $e) {
            Log::error('Error in UserController@getUserMonthlySales: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener productos más vendidos del usuario
     */
    public function getUserTopProducts(Request $request, $id)
    {
        try {
            // Verificar permisos
            $currentUser = auth()->user();
            if (!$currentUser) {
                return response()->json([
                    'status' => 401,
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Los administradores tienen acceso completo
            $isAdmin = $currentUser->role && $currentUser->role->name === 'Admin';

            if (!$isAdmin) {
                // Verificar si el usuario tiene el permiso ver_estadisticas_usuario
                $hasPermission = $currentUser->role
                    ->permissions()
                    ->where('name', 'ver_estadisticas_usuario')
                    ->exists();

                if (!$hasPermission) {
                    return response()->json([
                        'status' => 403,
                        'success' => false,
                        'message' => 'No tienes permiso para ver estadísticas de usuarios'
                    ], 403);
                }
            }

            // Verificar que el usuario existe
            $user = \App\Models\User::find($id);
            if (!$user) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ], 404);
            }

            // Consulta para productos más vendidos (solo productos existentes)
            $topProducts = \App\Models\SaleHeader::where('user_id', $id)
                ->where('status', '!=', 'annulled')
                ->with(['items.product'])
                ->get()
                ->flatMap(function ($sale) {
                    return $sale->items->map(function ($item) {
                        return [
                            'product_id' => $item->product_id,
                            'product_name' => $item->product->description ?? null,
                            'product_code' => $item->product->code ?? null,
                            'quantity' => $item->quantity,
                            'subtotal' => $item->item_total ?? 0,
                        ];
                    });
                })
                ->filter(function ($item) {
                    // Solo incluir productos que existen y están activos
                    return $item['product_name'] !== null && $item['product_name'] !== '';
                })
                ->groupBy('product_id')
                ->map(function ($items, $productId) {
                    $firstItem = $items->first();
                    return [
                        'product_id' => $productId,
                        'product_name' => $firstItem['product_name'],
                        'product_code' => $firstItem['product_code'],
                        'sales_count' => $items->count(),
                        'total_quantity' => $items->sum('quantity'),
                        'total_amount' => $items->sum('subtotal'),
                    ];
                })
                ->sortByDesc('total_amount')
                ->take(10)
                ->values();

            return response()->json($topProducts);

        } catch (\Exception $e) {
            Log::error('Error in UserController@getUserTopProducts: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }
}
