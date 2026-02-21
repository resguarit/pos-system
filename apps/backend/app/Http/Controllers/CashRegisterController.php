<?php

namespace App\Http\Controllers;

use App\Interfaces\CashRegisterServiceInterface;
use App\Services\CashRegisterStatusMessageService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use App\Models\CashMovement;
use App\Models\CashRegister;
use Carbon\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Barryvdh\DomPDF\Facade\Pdf as PDF;

class CashRegisterController extends Controller
{
    protected CashRegisterServiceInterface $cashRegisterService;
    protected CashRegisterStatusMessageService $messageService;

    public function __construct(
        CashRegisterServiceInterface $cashRegisterService,
        CashRegisterStatusMessageService $messageService
    ) {
        $this->cashRegisterService = $cashRegisterService;
        $this->messageService = $messageService;
    }

    public function index(Request $request): JsonResponse
    {
        $query = CashRegister::with(['branch', 'user']);

        // Filter by status if provided
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filter by branch if provided
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->input('branch_id'));
        }

        $cashRegisters = $query->orderBy('opened_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $cashRegisters
        ]);
    }

    public function open(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'branch_id' => 'required|integer|exists:branches,id',
            'user_id' => 'required|integer|exists:users,id',
            'initial_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $cashRegister = $this->cashRegisterService->openCashRegister($request->all());
            return response()->json([
                'message' => 'Caja abierta exitosamente',
                'data' => $cashRegister
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function close(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'final_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $cashRegister = $this->cashRegisterService->closeCashRegister($id, $request->all());
            return response()->json([
                'message' => 'Caja cerrada exitosamente',
                'data' => $cashRegister
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function current(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'branch_id' => 'required|integer|exists:branches,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $cashRegister = $this->cashRegisterService->getCurrentCashRegister($request->input('branch_id'));

        if (!$cashRegister) {
            return response()->json([
                'message' => 'No hay caja abierta en esta sucursal',
                'data' => null
            ], 200);
        }

        return response()->json([
            'message' => 'Caja actual obtenida',
            'data' => $cashRegister
        ], 200);
    }

    /**
     * Obtener información optimizada de la caja actual con campos calculados
     */
    public function currentOptimized(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'branch_id' => 'required|integer|exists:branches,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $branchId = $request->input('branch_id');

        $cashRegister = CashRegister::with(['branch', 'user'])
            ->where('branch_id', $branchId)
            ->where('status', 'open')
            ->first();

        if (!$cashRegister) {
            return response()->json([
                'message' => 'No hay caja abierta en esta sucursal',
                'data' => null
            ], 200);
        }

        // Verificar si necesita actualizar campos calculados
        $needsUpdate = $cashRegister->expected_cash_balance === null ||
            $cashRegister->payment_method_totals === null;

        // También verificar si hay movimientos más nuevos que la última actualización
        if (!$needsUpdate && $cashRegister->updated_at) {
            $latestMovement = $cashRegister->cashMovements()
                ->latest('created_at')
                ->first();

            if ($latestMovement && $latestMovement->created_at > $cashRegister->updated_at) {
                $needsUpdate = true;
            }
        }

        if ($needsUpdate) {
            $cashRegister->updateCalculatedFields();
            $cashRegister->refresh();
        }

        // Obtener información adicional para el frontend
        $paymentMethodTotals = $cashRegister->payment_method_totals ?? [];
        $expectedCashBalance = $cashRegister->expected_cash_balance ?? $cashRegister->calculateExpectedCashBalance();

        return response()->json([
            'message' => 'Caja actual obtenida',
            'data' => [
                'id' => $cashRegister->id,
                'branch' => $cashRegister->branch,
                'user' => $cashRegister->user,
                'opened_at' => $cashRegister->opened_at,
                'initial_amount' => $cashRegister->initial_amount,
                'expected_cash_balance' => $expectedCashBalance,
                'payment_method_totals' => $paymentMethodTotals,
                'total_income' => $cashRegister->total_income,
                'total_expenses' => $cashRegister->total_expenses,
                'status' => $cashRegister->status,
                'notes' => $cashRegister->notes,
            ]
        ], 200);
    }

    public function history(Request $request): JsonResponse
    {
        $history = $this->cashRegisterService->getCashRegisterHistory($request);

        // Add payment method totals to each cash register
        $historyData = $history->getCollection()->map(function ($cashRegister) {
            // Get all movements for this cash register
            $movements = $cashRegister->cashMovements()
                ->with(['movementType', 'paymentMethod'])
                ->get();

            // Group by payment method and calculate totals
            $paymentMethodTotals = [];
            foreach ($movements as $movement) {
                $paymentMethodName = $movement->paymentMethod->name ?? 'Sin especificar';
                $paymentMethodId = $movement->payment_method_id ?? 0;
                $amount = floatval($movement->amount);
                $isIncome = $movement->movementType->operation_type === 'entrada';

                if (!isset($paymentMethodTotals[$paymentMethodId])) {
                    $paymentMethodTotals[$paymentMethodId] = [
                        'id' => $paymentMethodId,
                        'name' => $paymentMethodName,
                        'income' => 0.0,
                        'expense' => 0.0,
                        'total' => 0.0,
                    ];
                }

                if ($isIncome) {
                    $paymentMethodTotals[$paymentMethodId]['income'] += $amount;
                } else {
                    $paymentMethodTotals[$paymentMethodId]['expense'] += $amount;
                }
                $paymentMethodTotals[$paymentMethodId]['total'] =
                    $paymentMethodTotals[$paymentMethodId]['income'] - $paymentMethodTotals[$paymentMethodId]['expense'];
            }

            // Add payment method totals to the register
            $cashRegister->payment_method_totals = array_values($paymentMethodTotals);

            return $cashRegister;
        });

        $history->setCollection($historyData);

        return response()->json([
            'message' => 'Historial de cajas obtenido',
            'data' => $history
        ], 200);
    }

    public function show(int $id): JsonResponse
    {
        try {
            $cashRegister = $this->cashRegisterService->getCashRegisterById($id);
            return response()->json([
                'message' => 'Caja obtenida',
                'data' => $cashRegister
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Caja no encontrada'], 404);
        }
    }

    /**
     * Verificar si hay una caja abierta para una sucursal
     */
    public function checkStatus(Request $request): JsonResponse
    {
        $branchId = $request->input('branch_id') ?? $request->user()->branch_id ?? 1;

        try {
            $currentCashRegister = $this->cashRegisterService->getCurrentCashRegister($branchId);

            if ($currentCashRegister) {
                return response()->json([
                    'success' => true,
                    'is_open' => true,
                    'message' => 'Caja abierta y disponible para operaciones',
                    'data' => [
                        'cash_register' => $currentCashRegister,
                        'branch_id' => $branchId,
                        'opened_at' => $currentCashRegister->opened_at,
                        'initial_amount' => $currentCashRegister->initial_amount,
                        'user' => $currentCashRegister->user->name ?? 'N/A'
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => true,
                    'is_open' => false,
                    'message' => 'No hay caja abierta para esta sucursal',
                    'data' => [
                        'cash_register' => null,
                        'branch_id' => $branchId,
                        'required_action' => 'Debe abrir una caja antes de realizar ventas'
                    ]
                ]);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'is_open' => false,
                'message' => 'Error al verificar estado de la caja: ' . $e->getMessage(),
                'error_code' => 'CASH_REGISTER_CHECK_ERROR'
            ], 500);
        }
    }

    /**
     * Obtener el último cierre de caja para una sucursal
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getLastClosure(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'branch_id' => 'required|integer|min:1|exists:branches,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $branchId = (int) $request->input('branch_id');
            $lastClosure = $this->cashRegisterService->getLastClosure($branchId);

            return response()->json([
                'message' => 'Último cierre obtenido exitosamente',
                'data' => [
                    'last_closure_amount' => $lastClosure,
                    'branch_id' => $branchId,
                    'has_previous_closure' => $lastClosure !== null
                ]
            ], 200);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => 'Parámetro inválido',
                'error' => $e->getMessage()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('Error al obtener último cierre de caja', [
                'branch_id' => $request->input('branch_id'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Error al obtener el último cierre',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Verificar el estado de caja para múltiples sucursales
     */
    public function checkMultipleBranchesStatus(Request $request): JsonResponse
    {
        $validator = $this->validateMultipleBranchesRequest($request);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $branchIds = $request->input('branch_ids');

        try {
            $status = $this->cashRegisterService->getMultipleBranchesCashRegisterStatus($branchIds);
            $message = $this->messageService->generateStatusMessage($status);

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $status
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse('Error al verificar el estado de las cajas: ' . $e->getMessage());
        }
    }

    /**
     * Validar request para múltiples sucursales
     */
    private function validateMultipleBranchesRequest(Request $request)
    {
        return Validator::make($request->all(), [
            'branch_ids' => 'required|array',
            'branch_ids.*' => 'integer|exists:branches,id',
        ]);
    }

    /**
     * Respuesta de error de validación
     */
    private function validationErrorResponse($errors): JsonResponse
    {
        return response()->json(['errors' => $errors], 422);
    }

    /**
     * Respuesta de error genérica
     */
    private function errorResponse(string $message): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => ['error' => $message]
        ], 500);
    }

    public function transactionsHistory(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'branch_id' => 'required|integer|exists:branches,id',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'type' => 'nullable|in:entry,exit',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Parámetros inválidos', 'errors' => $validator->errors()], 422);
        }

        $branchId = (int) $request->input('branch_id');
        $from = Carbon::parse($request->input('from_date'))->startOfDay();
        $to = Carbon::parse($request->input('to_date'))->endOfDay();
        $type = $request->input('type');
        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 5);

        // Buscar movimientos de caja de las cajas de la sucursal en el rango de fechas
        $query = CashMovement::with(['movementType', 'user', 'reference'])
            ->whereHas('cashRegister', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            })
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at');

        if ($type === 'entry') {
            $query->where(function ($q) {
                $q->whereHas('movementType', function ($mt) {
                    $mt->where('operation_type', 'entrada');
                })
                    ->orWhere('amount', '>', 0);
            });
        } elseif ($type === 'exit') {
            $query->where(function ($q) {
                $q->whereHas('movementType', function ($mt) {
                    $mt->where('operation_type', 'salida');
                })
                    ->orWhere('amount', '<', 0);
            });
        }

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);
        $collection = $paginator->getCollection();

        $mapped = $collection->map(function ($m) {
            $isEntry = strtolower($m->movementType->operation_type ?? '') === 'entrada' || (float) $m->amount > 0;
            $receiptNumber = null;
            if ($m->reference_type === 'sale' && $m->reference) {
                // reference is a SaleHeader thanks to morphMap
                $receiptNumber = $m->reference->receipt_number ?? null;
            }
            return [
                'id' => $m->id,
                'type' => $isEntry ? 'entry' : 'exit',
                'description' => $m->description,
                'amount' => (float) abs($m->amount),
                'created_at' => $m->created_at,
                'user' => [
                    'id' => $m->user->id ?? null,
                    'name' => $m->user->name ?? $m->user->full_name ?? $m->user->username ?? 'N/A',
                ],
                'sale' => $m->reference_type === 'sale' && $m->reference_id ? [
                    'id' => $m->reference_id,
                    'receipt_number' => $receiptNumber,
                ] : null,
                'payment_method' => null,
            ];
        });

        return response()->json([
            'data' => $mapped,
            'total' => $paginator->total(),
            'per_page' => $paginator->perPage(),
            'current_page' => $paginator->currentPage(),
        ]);
    }

    /**
     * Reporte de movimientos (PDF/Excel/CSV). Para simplificar, devolvemos CSV por ahora.
     */
    public function reportsMovements(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'branch_id' => 'required|integer|exists:branches,id',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'format' => 'nullable|in:pdf,excel,csv',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Parámetros inválidos', 'errors' => $validator->errors()], 422);
        }
        $branchId = (int) $request->input('branch_id');
        $from = Carbon::parse($request->input('from_date'))->startOfDay();
        $to = Carbon::parse($request->input('to_date'))->endOfDay();
        $format = $request->input('format', 'csv');

        $movements = CashMovement::with(['movementType', 'user', 'cashRegister.branch', 'cashRegister.user'])
            ->whereHas('cashRegister', fn($q) => $q->where('branch_id', $branchId))
            ->whereBetween('created_at', [$from, $to])
            ->orderBy('created_at')
            ->get();

        $rows = $movements->map(function ($m) {
            $isEntry = strtolower($m->movementType->operation_type ?? '') === 'entrada' || (float) $m->amount > 0;
            $branchDesc = $m->cashRegister->branch->description ?? 'N/A';
            $crUser = $m->cashRegister->user->name ?? 'N/A';
            $openedAt = $m->cashRegister->opened_at ? \Carbon\Carbon::parse($m->cashRegister->opened_at)->format('d/m/Y') : '';
            $cajaDetails = 'Sucursal: ' . $branchDesc . ', Usuario: ' . $crUser . ', Apertura: ' . $openedAt;
            return [
                'fecha' => ($m->created_at ? \Carbon\Carbon::parse($m->created_at)->format('d/m/Y') : ''),
                'tipo' => $isEntry ? 'Entrada' : 'Salida',
                'descripcion' => $m->description,
                'monto' => number_format(abs((float) $m->amount), 2, '.', ''),
                'usuario' => $m->user->name ?? $m->user->full_name ?? $m->user->username ?? 'N/A',
                'caja' => $cajaDetails,
            ];
        });

        $filenameBase = 'reporte_movimientos_' . $from->format('Y-m-d') . '_' . $to->format('Y-m-d');

        if ($format === 'pdf') {
            $html = view('reports.table-generic', [
                'title' => 'Reporte de Movimientos',
                'headers' => ['Fecha', 'Tipo', 'Descripción', 'Monto', 'Usuario', 'Caja'],
                'rows' => $rows,
            ])->render();
            $pdf = PDF::loadHTML($html)->setPaper('a4', 'portrait');
            return $pdf->download($filenameBase . '.pdf');
        }

        if ($format === 'excel') {
            $html = $this->buildHtmlTable('Reporte de Movimientos', ['Fecha', 'Tipo', 'Descripción', 'Monto', 'Usuario', 'Caja'], $rows);
            return response($html, 200, [
                'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $filenameBase . '.xls"',
            ]);
        }

        $response = new StreamedResponse(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Fecha', 'Tipo', 'Descripción', 'Monto', 'Usuario', 'Caja']);
            foreach ($rows as $r) {
                fputcsv($handle, [$r['fecha'], $r['tipo'], $r['descripcion'], $r['monto'], $r['usuario'], $r['caja']]);
            }
            fclose($handle);
        });
        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filenameBase . '.csv"');
        return $response;
    }

    /**
     * Reporte de cierres (CSV simple).
     */
    public function reportsClosures(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'branch_id' => 'required|integer|exists:branches,id',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'user_id' => 'sometimes|integer|exists:users,id',
            'format' => 'nullable|in:pdf,excel,csv',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Parámetros inválidos', 'errors' => $validator->errors()], 422);
        }
        $branchId = (int) $request->input('branch_id');
        $from = Carbon::parse($request->input('from_date'))->startOfDay();
        $to = Carbon::parse($request->input('to_date'))->endOfDay();
        $format = $request->input('format', 'csv');

        $query = \App\Models\CashRegister::with(['branch', 'user'])
            ->where('branch_id', $branchId)
            ->whereBetween('opened_at', [$from, $to])
            ->orderBy('opened_at');
        if ($request->filled('user_id')) {
            $query->where('user_id', (int) $request->input('user_id'));
        }
        $registers = $query->get();

        $rows = $registers->map(function ($r) {
            return [
                'id' => $r->id,
                'sucursal' => $r->branch->description ?? 'N/A',
                'usuario' => $r->user->name ?? 'N/A',
                'apertura' => ($r->opened_at ? \Carbon\Carbon::parse($r->opened_at)->format('d/m/Y') : ''),
                'cierre' => ($r->closed_at ? \Carbon\Carbon::parse($r->closed_at)->format('d/m/Y') : ''),
                'inicial' => number_format((float) $r->initial_amount, 2, '.', ''),
                'final' => number_format((float) ($r->final_amount ?? 0), 2, '.', ''),
                'estado' => $r->status,
            ];
        });

        $filenameBase = 'reporte_cierres_' . $from->format('Y-m-d') . '_' . $to->format('Y-m-d');

        if ($format === 'pdf') {
            $html = view('reports.table-generic', [
                'title' => 'Reporte de Cierres',
                'headers' => ['Caja ID', 'Sucursal', 'Usuario', 'Apertura', 'Cierre', 'Inicial', 'Final', 'Estado'],
                'rows' => $rows,
            ])->render();
            $pdf = PDF::loadHTML($html)->setPaper('a4', 'landscape');
            return $pdf->download($filenameBase . '.pdf');
        }

        if ($format === 'excel') {
            $html = $this->buildHtmlTable('Reporte de Cierres', ['Caja ID', 'Sucursal', 'Usuario', 'Apertura', 'Cierre', 'Inicial', 'Final', 'Estado'], $rows);
            return response($html, 200, [
                'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $filenameBase . '.xls"',
            ]);
        }

        $response = new StreamedResponse(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Caja ID', 'Sucursal', 'Usuario', 'Apertura', 'Cierre', 'Inicial', 'Final', 'Estado']);
            foreach ($rows as $r) {
                fputcsv($handle, [$r['id'], $r['sucursal'], $r['usuario'], $r['apertura'], $r['cierre'], $r['inicial'], $r['final'], $r['estado']]);
            }
            fclose($handle);
        });
        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filenameBase . '.csv"');
        return $response;
    }

    /**
     * Reporte financiero (CSV simple por período).
     */
    public function reportsFinancial(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'branch_id' => 'required|integer|exists:branches,id',
            'period' => 'required|in:day,week,month,year',
            'detail' => 'nullable|in:summary,detailed',
            'format' => 'nullable|in:pdf,excel,csv',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Parámetros inválidos', 'errors' => $validator->errors()], 422);
        }
        $branchId = (int) $request->input('branch_id');
        $period = $request->input('period');
        $format = $request->input('format', 'csv');
        $detail = $request->input('detail', 'summary');

        $from = match ($period) {
            'day' => Carbon::now()->startOfDay(),
            'week' => Carbon::now()->startOfWeek(),
            'month' => Carbon::now()->startOfMonth(),
            'year' => Carbon::now()->startOfYear(),
            default => Carbon::now()->startOfMonth(),
        };
        $to = Carbon::now()->endOfDay();

        $movements = CashMovement::with(['movementType'])
            ->whereHas('cashRegister', fn($q) => $q->where('branch_id', $branchId))
            ->whereBetween('created_at', [$from, $to])
            ->get();

        $income = 0;
        $expense = 0;
        foreach ($movements as $m) {
            $isEntry = strtolower($m->movementType->operation_type ?? '') === 'entrada' || (float) $m->amount > 0;
            if ($isEntry) {
                $income += abs((float) $m->amount);
            } else {
                $expense += abs((float) $m->amount);
            }
        }
        $net = $income - $expense;

        // Detailed rows by day
        $rowsDetailed = [];
        if ($detail === 'detailed') {
            // Group by date string Y-m-d
            $grouped = $movements->groupBy(function ($m) {
                return \Carbon\Carbon::parse($m->created_at)->format('Y-m-d');
            });
            $cursor = $from->copy();
            while ($cursor->lte($to)) {
                $key = $cursor->format('Y-m-d');
                $dayMovs = $grouped->get($key, collect());
                $dayIncome = 0;
                $dayExpense = 0;
                foreach ($dayMovs as $dm) {
                    $isEntry = strtolower($dm->movementType->operation_type ?? '') === 'entrada' || (float) $dm->amount > 0;
                    if ($isEntry) {
                        $dayIncome += abs((float) $dm->amount);
                    } else {
                        $dayExpense += abs((float) $dm->amount);
                    }
                }
                $rowsDetailed[] = [
                    'fecha' => \Carbon\Carbon::createFromFormat('Y-m-d', $key)->format('d/m/Y'),
                    'ingresos' => number_format($dayIncome, 2, '.', ''),
                    'egresos' => number_format($dayExpense, 2, '.', ''),
                    'neto' => number_format($dayIncome - $dayExpense, 2, '.', ''),
                ];
                $cursor->addDay();
            }
        }

        $filenameBase = 'reporte_financiero_' . $period;

        if ($format === 'pdf') {
            $html = view('reports.financial', [
                'title' => 'Reporte Financiero',
                'period' => $period,
                'from' => $from,
                'to' => $to,
                'income' => $income,
                'expense' => $expense,
                'net' => $net,
                'detail' => $detail,
                'rows' => $rowsDetailed,
            ])->render();
            $pdf = PDF::loadHTML($html)->setPaper('a4', 'portrait');
            return $pdf->download($filenameBase . '.pdf');
        }

        if ($format === 'excel') {
            // Build a combined HTML with summary and optional detail table
            $summaryHeaders = ['Período', 'Desde', 'Hasta', 'Ingresos', 'Egresos', 'Neto'];
            $summaryRows = [
                [
                    $period,
                    $from->format('d/m/Y'),
                    $to->format('d/m/Y'),
                    number_format($income, 2, '.', ''),
                    number_format($expense, 2, '.', ''),
                    number_format($net, 2, '.', ''),
                ]
            ];
            $html = $this->buildHtmlTable('Resumen Financiero', $summaryHeaders, $summaryRows);
            if ($detail === 'detailed') {
                $detailHeaders = ['Fecha', 'Ingresos', 'Egresos', 'Neto'];
                $html .= $this->buildHtmlTable('Detalle por Día', $detailHeaders, $rowsDetailed);
            }
            return response($html, 200, [
                'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $filenameBase . '.xls"',
            ]);
        }

        // CSV
        $response = new StreamedResponse(function () use ($period, $from, $to, $income, $expense, $net, $detail, $rowsDetailed) {
            $handle = fopen('php://output', 'w');
            // Summary first
            fputcsv($handle, ['Período', 'Desde', 'Hasta', 'Ingresos', 'Egresos', 'Neto']);
            fputcsv($handle, [
                $period,
                $from->format('d/m/Y'),
                $to->format('d/m/Y'),
                number_format($income, 2, '.', ''),
                number_format($expense, 2, '.', ''),
                number_format($net, 2, '.', ''),
            ]);
            if ($detail === 'detailed') {
                fputcsv($handle, []); // blank line
                fputcsv($handle, ['Fecha', 'Ingresos', 'Egresos', 'Neto']);
                foreach ($rowsDetailed as $r) {
                    fputcsv($handle, [$r['fecha'], $r['ingresos'], $r['egresos'], $r['neto']]);
                }
            }
            fclose($handle);
        });
        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filenameBase . '.csv"');
        return $response;
    }

    /**
     * Obtener historial de cajas para múltiples sucursales
     */
    public function cashRegistersHistory(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'branch_ids' => 'required|array',
            'branch_ids.*' => 'integer|exists:branches,id',
            'filters' => 'nullable|array',
            'filters.date_range' => 'nullable|string',
            'filters.custom_dates' => 'nullable|array',
            'filters.custom_dates.from' => 'nullable|date',
            'filters.custom_dates.to' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $branchIds = $request->input('branch_ids');
        $filters = $request->input('filters', []);

        try {
            // Obtener todas las cajas de las sucursales especificadas
            $query = CashRegister::with(['branch', 'user'])
                ->whereIn('branch_id', $branchIds);

            // Aplicar filtros de fecha si existen
            if (!empty($filters['date_range']) && $filters['date_range'] !== 'all') {
                $customDates = [];
                if ($filters['date_range'] === 'custom' && !empty($filters['custom_dates'])) {
                    $customDates = $filters['custom_dates'];
                }
                $this->applyDateFilter($query, $filters['date_range'], $customDates, 'opened_at');
            }

            $cashRegisters = $query->orderBy('opened_at', 'desc')->get();

            // Log para debuggear
            \Illuminate\Support\Facades\Log::info('Cash Registers History Query', [
                'branch_ids' => $branchIds,
                'filters' => $filters,
                'total_found' => $cashRegisters->count(),
                'first_register' => $cashRegisters->first() ? [
                    'id' => $cashRegisters->first()->id,
                    'branch_id' => $cashRegisters->first()->branch_id,
                    'opened_at' => $cashRegisters->first()->opened_at,
                    'status' => $cashRegisters->first()->status
                ] : null
            ]);

            // Verificar si hay cajas en total para estas sucursales
            $totalCashRegisters = CashRegister::whereIn('branch_id', $branchIds)->count();
            \Illuminate\Support\Facades\Log::info('Total Cash Registers for branches', [
                'branch_ids' => $branchIds,
                'total_count' => $totalCashRegisters
            ]);

            $history = $cashRegisters->map(function ($cashRegister) {
                // Calcular el saldo esperado para esta caja
                $expectedCashBalance = $cashRegister->initial_amount;

                // Obtener todos los movimientos de esta caja
                $movements = $cashRegister->cashMovements()
                    ->with(['movementType', 'paymentMethod'])
                    ->get();

                // Calcular el saldo esperado basado en movimientos de efectivo
                // Y agrupar por método de pago
                $paymentMethodTotals = [];

                foreach ($movements as $movement) {
                    $amount = floatval($movement->amount);
                    $isIncome = $movement->movementType->operation_type === 'entrada';

                    // Determinar el nombre del método de pago
                    $paymentMethodName = $movement->paymentMethod->name ?? 'Sin especificar';
                    $paymentMethodId = $movement->payment_method_id ?? 0;

                    // Inicializar el array para este método de pago si no existe
                    if (!isset($paymentMethodTotals[$paymentMethodId])) {
                        $paymentMethodTotals[$paymentMethodId] = [
                            'id' => $paymentMethodId,
                            'name' => $paymentMethodName,
                            'income' => 0.0,
                            'expense' => 0.0,
                            'total' => 0.0,
                        ];
                    }

                    // Sumar al método de pago correspondiente
                    if ($isIncome) {
                        $paymentMethodTotals[$paymentMethodId]['income'] += $amount;
                    } else {
                        $paymentMethodTotals[$paymentMethodId]['expense'] += $amount;
                    }
                    $paymentMethodTotals[$paymentMethodId]['total'] =
                        $paymentMethodTotals[$paymentMethodId]['income'] - $paymentMethodTotals[$paymentMethodId]['expense'];

                    // Solo considerar movimientos de efectivo para el saldo esperado
                    if ($movement->paymentMethod && $movement->paymentMethod->name === 'Efectivo') {
                        if ($isIncome) {
                            $expectedCashBalance += $amount;
                        } else {
                            $expectedCashBalance -= $amount;
                        }
                    }
                }

                // Convertir a array indexado para JSON
                $paymentMethodTotals = array_values($paymentMethodTotals);

                return [
                    'id' => $cashRegister->id,
                    'branch_id' => $cashRegister->branch_id,
                    'branch_name' => $cashRegister->branch->description ?? 'N/A',
                    'user_name' => $cashRegister->user->name ?? $cashRegister->user->username ?? 'N/A',
                    'opened_at' => $cashRegister->opened_at,
                    'closed_at' => $cashRegister->closed_at,
                    'initial_amount' => $cashRegister->initial_amount,
                    'final_amount' => $cashRegister->final_amount,
                    'expected_cash_balance' => $expectedCashBalance,
                    'status' => $cashRegister->status,
                    'notes' => $cashRegister->notes,
                    'payment_method_totals' => $paymentMethodTotals,
                ];
            });

            return response()->json([
                'message' => 'Historial de cajas obtenido exitosamente',
                'data' => $history,
                'total' => $history->count()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener el historial de cajas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener métodos de pago categorizados para optimización frontend
     */
    public function multipleBranches(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'branch_ids' => 'required|array',
            'branch_ids.*' => 'integer|exists:branches,id',
            'filters' => 'nullable|array',
            'filters.date_range' => 'nullable|string',
            'filters.custom_dates' => 'nullable|array',
            'filters.custom_dates.from' => 'nullable|date',
            'filters.custom_dates.to' => 'nullable|date',
            'filters.search' => 'nullable|string',
            'filters.movement_type' => 'nullable|integer',
            'filters.branch' => 'nullable|integer',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $branchIds = $request->input('branch_ids');
        $filters = $request->input('filters', []);
        $page = $request->input('page', 1);
        $perPage = $request->input('per_page', 15);

        try {
            // 1. Obtener cajas ABIERTAS para el estado actual y estadísticas de balance
            // Optimizamos trayendo solo las cajas abiertas
            $openCashRegisters = CashRegister::with(['branch', 'user'])
                ->whereIn('branch_id', $branchIds)
                ->where('status', 'open')
                ->get();

            // 2. Calcular estadísticas consolidadas
            $consolidatedStats = [
                'total_balance' => 0.0,
                'total_income' => 0.0,
                'total_expenses' => 0.0,
                'total_saldo' => 0.0,
                'open_cash_registers' => $openCashRegisters->count(),
                'closed_cash_registers' => 0, // Se calculará después
                'total_branches' => count($branchIds)
            ];

            // Calcular balance total (suma de esperados de cajas abiertas)
            foreach ($openCashRegisters as $register) {
                $consolidatedStats['total_balance'] += (float) ($register->expected_cash_balance ?? $register->calculateExpectedCashBalance());
            }

            // Calcular cajas cerradas
            // Asumimos que si una sucursal no tiene caja abierta, está cerrada.
            // Esto es una aproximación, ya que branchIds son todas las solicitadas.
            // Pero el código original restaba open de total.
            $consolidatedStats['closed_cash_registers'] = count($branchIds) - $consolidatedStats['open_cash_registers'];

            // 3. Calcular Totales de Ingresos/Egresos (Entradas/Salidas)
            // El código original aplicaba filtros Y ademas restringia a HOY.
            // Vamos a replicar la lógica: Filtros de request + Filtro de HOY para las estadisticas

            $statsQuery = \App\Models\CashMovement::whereHas('cashRegister', function ($q) use ($branchIds) {
                $q->whereIn('branch_id', $branchIds);
            });

            // Aplicar filtros del request (search, branch, type, date_range...)
            $this->applyFiltersToQuery($statsQuery, $filters);

            // ADEMAS, restringir a HOY para coincidir con la lógica original de "todayIncome"
            // Si el filtro de fecha del request excluye hoy, esto dará 0, lo cual es correcto según la lógica original.
            $statsQuery->where('created_at', '>=', now()->startOfDay());

            // Clonar para ingresos y egresos
            $incomeQuery = clone $statsQuery;
            $expensesQuery = clone $statsQuery;

            $consolidatedStats['total_income'] = (float) $incomeQuery->whereHas('movementType', function ($q) {
                $q->where('operation_type', 'entrada');
            })->sum('amount');

            $consolidatedStats['total_expenses'] = (float) $expensesQuery->whereHas('movementType', function ($q) {
                $q->where('operation_type', 'salida');
            })->sum('amount');

            $consolidatedStats['total_saldo'] = $consolidatedStats['total_income'] - $consolidatedStats['total_expenses'];


            // 4. Obtener Movimientos Paginados (All Movements)
            $movementsQuery = \App\Models\CashMovement::with(['movementType', 'user', 'paymentMethod', 'cashRegister.branch'])
                ->whereHas('cashRegister', function ($q) use ($branchIds) {
                    $q->whereIn('branch_id', $branchIds);
                });

            // Aplicar filtros
            $this->applyFiltersToQuery($movementsQuery, $filters);

            // Paginar
            $paginatedMovements = $movementsQuery->orderBy('created_at', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            // Formatear movimientos para incluir branch_name (compatibilidad)
            $paginatedMovements->getCollection()->transform(function ($movement) {
                $movement->branch_id = $movement->cashRegister->branch_id;
                $movement->branch_name = $movement->cashRegister->branch->description ?? 'N/A';
                return $movement;
            });

            // 5. Preparar datos de cash_registers para la respuesta
            // Solo devolvemos las cajas abiertas para mantener la respuesta ligera y relevante para "Estados"
            // Si el frontend necesita historial de cajas, usa otro endpoint.
            $cashRegistersData = [];
            foreach ($openCashRegisters as $cashRegister) {
                // Optimización: Usar los campos pre-calculados del modelo si la caja se abrió hoy
                // Si la caja se abrió antes, necesitamos calcular solo lo de hoy
                $isOpenedToday = $cashRegister->opened_at && $cashRegister->opened_at->isToday();

                if ($isOpenedToday) {
                    $todayIncome = $cashRegister->total_income;
                    $todayExpenses = $cashRegister->total_expenses;
                    // Count movements just for today (optional, but keep for compatibility)
                    $movementsCount = $cashRegister->cashMovements()
                        ->where('created_at', '>=', now()->startOfDay())
                        ->count();
                } else {
                    // Si se abrió otro día, calculamos lo de hoy via SQL (no traer todo a memoria)
                    $todayIncome = $cashRegister->cashMovements()
                        ->where('created_at', '>=', now()->startOfDay())
                        ->whereHas('movementType', function ($q) {
                            $q->where('operation_type', 'entrada');
                        })
                        ->sum('amount');

                    $todayExpenses = $cashRegister->cashMovements()
                        ->where('created_at', '>=', now()->startOfDay())
                        ->whereHas('movementType', function ($q) {
                            $q->where('operation_type', 'salida');
                        })
                        ->sum('amount');

                    $movementsCount = $cashRegister->cashMovements()
                        ->where('created_at', '>=', now()->startOfDay())
                        ->count();
                }

                $cashRegistersData[] = [
                    'id' => $cashRegister->id,
                    'branch_id' => $cashRegister->branch_id,
                    'branch' => $cashRegister->branch,
                    'user' => $cashRegister->user,
                    'opened_at' => $cashRegister->opened_at,
                    'initial_amount' => $cashRegister->initial_amount,
                    'expected_cash_balance' => $cashRegister->expected_cash_balance ?? $cashRegister->calculateExpectedCashBalance(),
                    'payment_method_totals' => $cashRegister->payment_method_totals ?? [],
                    'status' => $cashRegister->status,
                    'notes' => $cashRegister->notes,
                    'total_income' => $cashRegister->total_income,
                    'total_expenses' => $cashRegister->total_expenses,
                    'today_income' => $todayIncome,
                    'today_expenses' => $todayExpenses,
                    'movements_count' => $movementsCount
                ];
            }

            return response()->json([
                'message' => 'Datos consolidados de múltiples sucursales obtenidos',
                'data' => [
                    'consolidated_stats' => $consolidatedStats,
                    'cash_registers' => $cashRegistersData,
                    'all_movements' => $paginatedMovements->items(),
                    'pagination' => [
                        'total' => $paginatedMovements->total(),
                        'per_page' => $paginatedMovements->perPage(),
                        'current_page' => $paginatedMovements->currentPage(),
                        'last_page' => $paginatedMovements->lastPage(),
                        'from' => $paginatedMovements->firstItem(),
                        'to' => $paginatedMovements->lastItem(),
                    ],
                    'branches_count' => count($branchIds),
                    'timestamp' => now()->toISOString()
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener datos consolidados',
                'error' => $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine()
            ], 500);
        }
    }

    /**
     * Helper para aplicar filtros a una query de CashMovement
     */
    private function applyFiltersToQuery($query, array $filters)
    {
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('username', 'like', "%{$search}%")
                            ->orWhereHas('person', function ($personQuery) use ($search) {
                                $personQuery->where('first_name', 'like', "%{$search}%")
                                    ->orWhere('last_name', 'like', "%{$search}%");
                            });
                    });
                // Eliminamos filtro por branch description aquí si ya filtramos por branch_ids arriba, 
                // pero si es búsqueda global, está bien dejarlo.
                // Pero la query base ya filtra por las branches seleccionadas.
            });
        }

        if (!empty($filters['movement_type'])) {
            $query->where('movement_type_id', $filters['movement_type']);
        }

        if (!empty($filters['branch'])) {
            $query->whereHas('cashRegister', function ($q) use ($filters) {
                $q->where('branch_id', $filters['branch']);
            });
        }

        if (!empty($filters['date_range'])) {
            $customDates = [];
            if ($filters['date_range'] === 'custom' && !empty($filters['custom_dates'])) {
                $customDates = $filters['custom_dates'];
            }
            $this->applyDateFilter($query, $filters['date_range'], $customDates);
        }
    }

    public function getPaymentMethodsOptimized(): JsonResponse
    {
        $paymentMethods = \App\Models\PaymentMethod::where('is_active', true)
            ->orderBy('name')
            ->get();

        // Palabras clave para categorizar métodos de pago
        $cashKeywords = ['efectivo', 'cash', 'contado'];
        $cardKeywords = ['tarjeta', 'card', 'débito', 'crédito', 'visa', 'mastercard'];
        $transferKeywords = ['transferencia', 'transfer', 'banco', 'mercadopago', 'mp'];

        $categorized = [
            'cash' => [],
            'card' => [],
            'transfer' => [],
            'other' => []
        ];

        foreach ($paymentMethods as $method) {
            $name = strtolower($method->name);
            $category = 'other';

            if ($method->affects_cash === true) {
                $category = 'cash';
            }

            if ($category === 'other') {
                foreach ($cashKeywords as $keyword) {
                    if (strpos($name, $keyword) !== false) {
                        $category = 'cash';
                        break;
                    }
                }
            }

            if ($category === 'other') {
                foreach ($cardKeywords as $keyword) {
                    if (strpos($name, $keyword) !== false) {
                        $category = 'card';
                        break;
                    }
                }
            }

            if ($category === 'other') {
                foreach ($transferKeywords as $keyword) {
                    if (strpos($name, $keyword) !== false) {
                        $category = 'transfer';
                        break;
                    }
                }
            }

            $categorized[$category][] = [
                'id' => $method->id,
                'name' => $method->name,
                'description' => $method->description,
            ];
        }

        return response()->json([
            'message' => 'Métodos de pago categorizados obtenidos',
            'data' => [
                'categorized' => $categorized,
                'all' => $paymentMethods->map(function ($method) {
                    return [
                        'id' => $method->id,
                        'name' => $method->name,
                        'description' => $method->description,
                    ];
                }),
                'keywords' => [
                    'cash' => $cashKeywords,
                    'card' => $cardKeywords,
                    'transfer' => $transferKeywords,
                ]
            ]
        ], 200);
    }

    private function buildHtmlTable(string $title, array $headers, $rows): string
    {
        $thead = '<tr>' . collect($headers)->map(fn($h) => '<th style="border:1px solid #ccc;padding:6px;text-align:left">' . e($h) . '</th>')->implode('') . '</tr>';
        $tbody = '';
        foreach ($rows as $row) {
            $values = is_array($row) ? $row : array_values($row);
            $tbody .= '<tr>' . collect($values)->map(fn($v) => '<td style="border:1px solid #eee;padding:6px">' . e((string) $v) . '</td>')->implode('') . '</tr>';
        }
        return '<html><head><meta charset="UTF-8"></head><body>'
            . '<h3 style="margin:0 0 10px 0;">' . e($title) . '</h3>'
            . '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:Arial, sans-serif;font-size:12px">'
            . '<thead style="background:#f3f4f6">' . $thead . '</thead>'
            . '<tbody>' . $tbody . '</tbody>'
            . '</table>'
            . '</body></html>';
    }

    /**
     * Exportar datos de caja en diferentes formatos
     */
    public function export(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        try {
            $branchIds = $request->get('branch_ids', []);
            $format = $request->get('format', 'excel');
            $type = $request->get('type', 'movements');
            $filters = $request->get('filters', []);

            // Validar que branch_ids sea un array de enteros
            if (!is_array($branchIds)) {
                $branchIds = [$branchIds];
            }
            $branchIds = array_map('intval', $branchIds);

            $data = [];
            $filename = '';

            switch ($type) {
                case 'movements':
                    $data = $this->getMovementsForExport($branchIds, $filters);
                    $filename = 'movimientos_caja';
                    break;
                case 'summary':
                    $data = $this->getSummaryForExport($branchIds, $filters);
                    $filename = 'resumen_caja';
                    break;
                case 'comparison':
                    $data = $this->getComparisonForExport($branchIds, $filters);
                    $filename = 'comparacion_sucursales';
                    break;
                default:
                    throw new \InvalidArgumentException('Tipo de exportación no válido');
            }

            return $this->generateExportResponse($data, $filename, $format);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al exportar los datos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function getMovementsForExport(array $branchIds, array $filters): array
    {
        $query = \App\Models\CashMovement::with(['movementType', 'user', 'cashRegister.branch'])
            ->whereHas('cashRegister', function ($q) use ($branchIds) {
                $q->whereIn('branch_id', $branchIds);
            });

        // Aplicar filtros
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('username', 'like', "%{$search}%")
                            ->orWhereHas('person', function ($personQuery) use ($search) {
                                $personQuery->where('first_name', 'like', "%{$search}%")
                                    ->orWhere('last_name', 'like', "%{$search}%");
                            });
                    })
                    ->orWhereHas('cashRegister.branch', function ($branchQuery) use ($search) {
                        $branchQuery->where('description', 'like', "%{$search}%");
                    });
            });
        }

        if (!empty($filters['movement_type'])) {
            $query->where('movement_type_id', $filters['movement_type']);
        }

        if (!empty($filters['branch'])) {
            $query->whereHas('cashRegister', function ($q) use ($filters) {
                $q->where('branch_id', $filters['branch']);
            });
        }

        // Filtro de fechas
        if (!empty($filters['date_range'])) {
            $customDates = [];
            if ($filters['date_range'] === 'custom' && !empty($filters['custom_dates'])) {
                $customDates = $filters['custom_dates'];
            }
            $this->applyDateFilter($query, $filters['date_range'], $customDates);
        }

        $movements = $query->orderBy('created_at', 'desc')->get();

        $data = [];
        foreach ($movements as $movement) {
            $data[] = [
                'Fecha' => $movement->created_at->format('d/m/Y H:i'),
                'Tipo' => $movement->movementType->description ?? 'N/A',
                'Descripción' => $movement->description,
                'Monto' => number_format((float) $movement->amount, 2, ',', '.'),
                'Sucursal' => $movement->cashRegister->branch->description ?? 'N/A',
                'Usuario' => $movement->user->name ?? $movement->user->username ?? 'N/A',
                'Operación' => ($movement->movementType->operation_type ?? 'entrada') === 'entrada' ? 'Ingreso' : 'Egreso'
            ];
        }

        return $data;
    }

    private function getSummaryForExport(array $branchIds, array $filters): array
    {
        // Obtener estadísticas consolidadas
        $stats = $this->getConsolidatedStats($branchIds, $filters);

        return [
            [
                'Métrica' => 'Balance Total',
                'Valor' => number_format((float) ($stats['total_balance'] ?? 0), 2, ',', '.')
            ],
            [
                'Métrica' => 'Ingresos Totales',
                'Valor' => number_format((float) ($stats['total_income'] ?? 0), 2, ',', '.')
            ],
            [
                'Métrica' => 'Egresos Totales',
                'Valor' => number_format((float) ($stats['total_expenses'] ?? 0), 2, ',', '.')
            ],
            [
                'Métrica' => 'Total de Movimientos',
                'Valor' => $stats['total_movements'] ?? 0
            ]
        ];
    }

    private function getComparisonForExport(array $branchIds, array $filters): array
    {
        $data = [];

        foreach ($branchIds as $branchId) {
            $branch = \App\Models\Branch::find($branchId);
            if (!$branch)
                continue;

            $stats = $this->getBranchStats($branchId, $filters);

            $data[] = [
                'Sucursal' => $branch->description,
                'Balance' => number_format((float) ($stats['balance'] ?? 0), 2, ',', '.'),
                'Ingresos' => number_format((float) ($stats['income'] ?? 0), 2, ',', '.'),
                'Egresos' => number_format((float) ($stats['expenses'] ?? 0), 2, ',', '.'),
                'Movimientos' => $stats['movements'] ?? 0,
                'Estado' => $stats['is_open'] ? 'Abierta' : 'Cerrada'
            ];
        }

        return $data;
    }

    private function getConsolidatedStats(array $branchIds, array $filters): array
    {
        $query = \App\Models\CashMovement::whereHas('cashRegister', function ($q) use ($branchIds) {
            $q->whereIn('branch_id', $branchIds);
        });

        // Aplicar filtros
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where('description', 'like', "%{$search}%");
        }

        if (!empty($filters['movement_type'])) {
            $query->where('movement_type_id', $filters['movement_type']);
        }

        if (!empty($filters['date_range'])) {
            $this->applyDateFilter($query, $filters['date_range']);
        }

        $movements = $query->with('movementType')->get();

        $totalIncome = 0;
        $totalExpenses = 0;

        foreach ($movements as $movement) {
            $amount = floatval($movement->amount);
            $isIncome = ($movement->movementType->operation_type ?? 'entrada') === 'entrada';

            if ($isIncome) {
                $totalIncome += $amount;
            } else {
                $totalExpenses += $amount;
            }
        }

        return [
            'total_balance' => $totalIncome - $totalExpenses,
            'total_income' => $totalIncome,
            'total_expenses' => $totalExpenses,
            'total_movements' => $movements->count()
        ];
    }

    private function getBranchStats(int $branchId, array $filters): array
    {
        $query = \App\Models\CashMovement::whereHas('cashRegister', function ($q) use ($branchId) {
            $q->where('branch_id', $branchId);
        });

        // Aplicar filtros
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where('description', 'like', "%{$search}%");
        }

        if (!empty($filters['movement_type'])) {
            $query->where('movement_type_id', $filters['movement_type']);
        }

        if (!empty($filters['date_range'])) {
            $this->applyDateFilter($query, $filters['date_range']);
        }

        $movements = $query->with('movementType')->get();

        $income = 0;
        $expenses = 0;

        foreach ($movements as $movement) {
            $amount = floatval($movement->amount);
            $isIncome = ($movement->movementType->operation_type ?? 'entrada') === 'entrada';

            if ($isIncome) {
                $income += $amount;
            } else {
                $expenses += $amount;
            }
        }

        // Obtener estado de la caja
        $cashRegister = \App\Models\CashRegister::where('branch_id', $branchId)
            ->where('status', 'open')
            ->first();

        return [
            'balance' => $income - $expenses,
            'income' => $income,
            'expenses' => $expenses,
            'movements' => $movements->count(),
            'is_open' => $cashRegister ? true : false
        ];
    }

    private function applyDateFilter($query, string $dateRange, array $customDates = [], string $dateField = 'created_at'): void
    {
        $now = now();

        switch ($dateRange) {
            case 'today':
                $start = $now->copy()->startOfDay()->setTimezone('UTC');
                $end = $now->copy()->endOfDay()->setTimezone('UTC');
                $query->whereBetween($dateField, [$start, $end]);
                break;
            case 'yesterday':
                $yesterday = $now->copy()->subDay();
                $start = $yesterday->copy()->startOfDay()->setTimezone('UTC');
                $end = $yesterday->copy()->endOfDay()->setTimezone('UTC');
                $query->whereBetween($dateField, [$start, $end]);
                break;
            case 'week':
                $start = $now->copy()->startOfWeek()->setTimezone('UTC');
                $query->where($dateField, '>=', $start);
                break;
            case 'month':
                $start = $now->copy()->startOfMonth()->setTimezone('UTC');
                $query->where($dateField, '>=', $start);
                break;
            case 'custom':
                if (!empty($customDates['from']) && !empty($customDates['to'])) {
                    $from = \Carbon\Carbon::parse($customDates['from'])->startOfDay()->setTimezone('UTC');
                    $to = \Carbon\Carbon::parse($customDates['to'])->endOfDay()->setTimezone('UTC');
                    $query->whereBetween($dateField, [$from, $to]);
                }
                break;
        }
    }

    private function generateExportResponse(array $data, string $filename, string $format): \Symfony\Component\HttpFoundation\Response
    {
        $timestamp = now()->format('Y-m-d_H-i-s');
        $fullFilename = "{$filename}_{$timestamp}";

        switch ($format) {
            case 'csv':
                return $this->exportToCsv($data, $fullFilename);
            case 'pdf':
                return $this->exportToPdf($data, $fullFilename);
            case 'excel':
            default:
                return $this->exportToExcel($data, $fullFilename);
        }
    }

    private function exportToCsv(array $data, string $filename): \Symfony\Component\HttpFoundation\Response
    {
        $headers = array_keys($data[0] ?? []);
        $csv = implode(',', $headers) . "\n";

        foreach ($data as $row) {
            $csv .= implode(',', array_map(function ($value) {
                return '"' . str_replace('"', '""', $value) . '"';
            }, $row)) . "\n";
        }

        return response($csv)
            ->header('Content-Type', 'text/csv; charset=UTF-8')
            ->header('Content-Disposition', "attachment; filename=\"{$filename}.csv\"");
    }

    private function exportToPdf(array $data, string $filename): \Symfony\Component\HttpFoundation\Response
    {
        $headers = array_keys($data[0] ?? []);
        $html = $this->buildHtmlTable('Reporte de Caja', $headers, $data);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);

        return $pdf->download("{$filename}.pdf");
    }

    private function exportToExcel(array $data, string $filename): \Symfony\Component\HttpFoundation\Response
    {
        // Generar HTML para Excel (formato que Excel puede abrir)
        $headers = array_keys($data[0] ?? []);

        // Agregar información del rango de fechas y sucursales
        $exportInfo = $this->getExportInfo($data);
        $html = $this->buildHtmlTableWithInfo('Reporte de Caja', $headers, $data, $exportInfo);

        return response($html)
            ->header('Content-Type', 'application/vnd.ms-excel; charset=UTF-8')
            ->header('Content-Disposition', "attachment; filename=\"{$filename}.xls\"");
    }

    private function getExportInfo(array $data = []): array
    {
        $request = request();
        $branchIds = $request->get('branch_ids', []);
        $filters = $request->get('filters', []);

        // Obtener nombres de sucursales
        $branches = \App\Models\Branch::whereIn('id', $branchIds)->pluck('description')->toArray();

        // Determinar rango de fechas
        $dateRange = $filters['date_range'] ?? 'all';
        $dateInfo = $this->getDateRangeInfo($dateRange);

        return [
            'branches' => $branches,
            'date_range' => $dateInfo,
            'total_movements' => count($data),
            'exported_at' => now()->format('d/m/Y H:i:s')
        ];
    }

    private function getDateRangeInfo(string $dateRange): array
    {
        $now = now();

        switch ($dateRange) {
            case 'today':
                return [
                    'label' => 'Hoy',
                    'from' => $now->format('d/m/Y'),
                    'to' => $now->format('d/m/Y')
                ];
            case 'yesterday':
                $yesterday = $now->subDay();
                return [
                    'label' => 'Ayer',
                    'from' => $yesterday->format('d/m/Y'),
                    'to' => $yesterday->format('d/m/Y')
                ];
            case 'week':
                return [
                    'label' => 'Esta semana',
                    'from' => $now->startOfWeek()->format('d/m/Y'),
                    'to' => $now->endOfWeek()->format('d/m/Y')
                ];
            case 'month':
                return [
                    'label' => 'Este mes',
                    'from' => $now->startOfMonth()->format('d/m/Y'),
                    'to' => $now->endOfMonth()->format('d/m/Y')
                ];
            case 'custom':
                // Para rango personalizado, necesitaríamos obtener las fechas del frontend
                return [
                    'label' => 'Rango personalizado',
                    'from' => 'Fecha personalizada',
                    'to' => 'Fecha personalizada'
                ];
            default:
                return [
                    'label' => 'Todas las fechas',
                    'from' => 'Sin límite',
                    'to' => 'Sin límite'
                ];
        }
    }

    private function buildHtmlTableWithInfo(string $title, array $headers, array $data, array $exportInfo): string
    {
        $html = '<html><head><meta charset="UTF-8"></head><body>';

        // Título principal
        $html .= '<h2 style="margin:0 0 20px 0;text-align:center;color:#2563eb;">' . e($title) . '</h2>';

        // Información de exportación
        $html .= '<div style="margin-bottom:20px;padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;">';
        $html .= '<h3 style="margin:0 0 10px 0;color:#374151;">Información del Reporte</h3>';

        // Sucursales
        $branchesText = !empty($exportInfo['branches']) ? implode(', ', $exportInfo['branches']) : 'Todas las sucursales';
        $html .= '<p style="margin:5px 0;"><strong>Sucursales:</strong> ' . e($branchesText) . '</p>';

        // Rango de fechas
        $dateInfo = $exportInfo['date_range'];
        $html .= '<p style="margin:5px 0;"><strong>Período:</strong> ' . e($dateInfo['label']) . '</p>';
        if ($dateInfo['from'] !== 'Sin límite' && $dateInfo['from'] !== 'Fecha personalizada') {
            $html .= '<p style="margin:5px 0;"><strong>Desde:</strong> ' . e($dateInfo['from']) . ' <strong>Hasta:</strong> ' . e($dateInfo['to']) . '</p>';
        }

        // Total de movimientos
        $html .= '<p style="margin:5px 0;"><strong>Total de movimientos:</strong> ' . e($exportInfo['total_movements']) . '</p>';

        // Fecha de exportación
        $html .= '<p style="margin:5px 0;"><strong>Exportado el:</strong> ' . e($exportInfo['exported_at']) . '</p>';

        $html .= '</div>';

        // Tabla de datos
        if (!empty($data)) {
            $thead = '<tr>' . collect($headers)->map(fn($h) => '<th style="border:1px solid #ccc;padding:8px;text-align:left;background:#f3f4f6;font-weight:bold;">' . e($h) . '</th>')->implode('') . '</tr>';
            $tbody = '';
            foreach ($data as $row) {
                $values = is_array($row) ? $row : array_values($row);
                $tbody .= '<tr>' . collect($values)->map(fn($v) => '<td style="border:1px solid #eee;padding:6px;">' . e((string) $v) . '</td>')->implode('') . '</tr>';
            }
            $html .= '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:Arial, sans-serif;font-size:12px;width:100%;">';
            $html .= '<thead>' . $thead . '</thead>';
            $html .= '<tbody>' . $tbody . '</tbody>';
            $html .= '</table>';
        } else {
            $html .= '<p style="text-align:center;color:#6b7280;font-style:italic;">No hay datos para mostrar</p>';
        }

        $html .= '</body></html>';

        return $html;
    }
}
