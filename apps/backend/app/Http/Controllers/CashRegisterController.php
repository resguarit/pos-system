<?php

namespace App\Http\Controllers;

use App\Interfaces\CashRegisterServiceInterface;
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

    public function __construct(CashRegisterServiceInterface $cashRegisterService)
    {
        $this->cashRegisterService = $cashRegisterService;
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
                'status' => $cashRegister->status,
                'notes' => $cashRegister->notes,
            ]
        ], 200);
    }

    public function history(Request $request): JsonResponse
    {
        $history = $this->cashRegisterService->getCashRegisterHistory($request);
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

    public function transactionsHistory(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'branch_id' => 'required|integer|exists:branches,id',
            'from_date' => 'required|date',
            'to_date'   => 'required|date|after_or_equal:from_date',
            'type'      => 'nullable|in:entry,exit',
            'page'      => 'nullable|integer|min:1',
            'per_page'  => 'nullable|integer|min:1|max:100',
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
                $q->whereHas('movementType', function ($mt) { $mt->where('operation_type', 'entrada'); })
                  ->orWhere('amount', '>', 0);
            });
        } elseif ($type === 'exit') {
            $query->where(function ($q) {
                $q->whereHas('movementType', function ($mt) { $mt->where('operation_type', 'salida'); })
                  ->orWhere('amount', '<', 0);
            });
        }

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);
        $collection = $paginator->getCollection();

        $mapped = $collection->map(function ($m) {
            $isEntry = strtolower($m->movementType->operation_type ?? '') === 'entrada' || (float)$m->amount > 0;
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
            'to_date'   => 'required|date|after_or_equal:from_date',
            'format'    => 'nullable|in:pdf,excel,csv',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Parámetros inválidos', 'errors' => $validator->errors()], 422);
        }
        $branchId = (int) $request->input('branch_id');
        $from = Carbon::parse($request->input('from_date'))->startOfDay();
        $to = Carbon::parse($request->input('to_date'))->endOfDay();
        $format = $request->input('format', 'csv');

        $movements = CashMovement::with(['movementType','user','cashRegister.branch','cashRegister.user'])
            ->whereHas('cashRegister', fn($q) => $q->where('branch_id', $branchId))
            ->whereBetween('created_at', [$from, $to])
            ->orderBy('created_at')
            ->get();

        $rows = $movements->map(function ($m) {
            $isEntry = strtolower($m->movementType->operation_type ?? '') === 'entrada' || (float)$m->amount > 0;
            $branchDesc = $m->cashRegister->branch->description ?? 'N/A';
            $crUser = $m->cashRegister->user->name ?? 'N/A';
            $openedAt = $m->cashRegister->opened_at ? \Carbon\Carbon::parse($m->cashRegister->opened_at)->format('d/m/Y') : '';
            $cajaDetails = 'Sucursal: '.$branchDesc.', Usuario: '.$crUser.', Apertura: '.$openedAt;
            return [
                'fecha' => ($m->created_at ? \Carbon\Carbon::parse($m->created_at)->format('d/m/Y') : ''),
                'tipo' => $isEntry ? 'Entrada' : 'Salida',
                'descripcion' => $m->description,
                'monto' => number_format(abs((float)$m->amount), 2, '.', ''),
                'usuario' => $m->user->name ?? $m->user->full_name ?? $m->user->username ?? 'N/A',
                'caja' => $cajaDetails,
            ];
        });

        $filenameBase = 'reporte_movimientos_'.$from->format('Y-m-d').'_'.$to->format('Y-m-d');

        if ($format === 'pdf') {
            $html = view('reports.table-generic', [
                'title' => 'Reporte de Movimientos',
                'headers' => ['Fecha','Tipo','Descripción','Monto','Usuario','Caja'],
                'rows' => $rows,
            ])->render();
            $pdf = PDF::loadHTML($html)->setPaper('a4', 'portrait');
            return $pdf->download($filenameBase.'.pdf');
        }

        if ($format === 'excel') {
            $html = $this->buildHtmlTable('Reporte de Movimientos', ['Fecha','Tipo','Descripción','Monto','Usuario','Caja'], $rows);
            return response($html, 200, [
                'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="'.$filenameBase.'.xls"',
            ]);
        }

        $response = new StreamedResponse(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Fecha','Tipo','Descripción','Monto','Usuario','Caja']);
            foreach ($rows as $r) {
                fputcsv($handle, [$r['fecha'],$r['tipo'],$r['descripcion'],$r['monto'],$r['usuario'],$r['caja']]);
            }
            fclose($handle);
        });
        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="'.$filenameBase.'.csv"');
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
            'to_date'   => 'required|date|after_or_equal:from_date',
            'user_id'   => 'sometimes|integer|exists:users,id',
            'format'    => 'nullable|in:pdf,excel,csv',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Parámetros inválidos', 'errors' => $validator->errors()], 422);
        }
        $branchId = (int) $request->input('branch_id');
        $from = Carbon::parse($request->input('from_date'))->startOfDay();
        $to = Carbon::parse($request->input('to_date'))->endOfDay();
        $format = $request->input('format', 'csv');

        $query = \App\Models\CashRegister::with(['branch','user'])
            ->where('branch_id', $branchId)
            ->whereBetween('opened_at', [$from, $to])
            ->orderBy('opened_at');
        if ($request->filled('user_id')) {
            $query->where('user_id', (int)$request->input('user_id'));
        }
        $registers = $query->get();

        $rows = $registers->map(function ($r) {
            return [
                'id' => $r->id,
                'sucursal' => $r->branch->description ?? 'N/A',
                'usuario' => $r->user->name ?? 'N/A',
                'apertura' => ($r->opened_at ? \Carbon\Carbon::parse($r->opened_at)->format('d/m/Y') : ''),
                'cierre' => ($r->closed_at ? \Carbon\Carbon::parse($r->closed_at)->format('d/m/Y') : ''),
                'inicial' => number_format((float)$r->initial_amount, 2, '.', ''),
                'final' => number_format((float)($r->final_amount ?? 0), 2, '.', ''),
                'estado' => $r->status,
            ];
        });

        $filenameBase = 'reporte_cierres_'.$from->format('Y-m-d').'_'.$to->format('Y-m-d');

        if ($format === 'pdf') {
            $html = view('reports.table-generic', [
                'title' => 'Reporte de Cierres',
                'headers' => ['Caja ID','Sucursal','Usuario','Apertura','Cierre','Inicial','Final','Estado'],
                'rows' => $rows,
            ])->render();
            $pdf = PDF::loadHTML($html)->setPaper('a4', 'landscape');
            return $pdf->download($filenameBase.'.pdf');
        }

        if ($format === 'excel') {
            $html = $this->buildHtmlTable('Reporte de Cierres', ['Caja ID','Sucursal','Usuario','Apertura','Cierre','Inicial','Final','Estado'], $rows);
            return response($html, 200, [
                'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="'.$filenameBase.'.xls"',
            ]);
        }

        $response = new StreamedResponse(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Caja ID','Sucursal','Usuario','Apertura','Cierre','Inicial','Final','Estado']);
            foreach ($rows as $r) {
                fputcsv($handle, [$r['id'],$r['sucursal'],$r['usuario'],$r['apertura'],$r['cierre'],$r['inicial'],$r['final'],$r['estado']]);
            }
            fclose($handle);
        });
        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="'.$filenameBase.'.csv"');
        return $response;
    }

    /**
     * Reporte financiero (CSV simple por período).
     */
    public function reportsFinancial(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'branch_id' => 'required|integer|exists:branches,id',
            'period'    => 'required|in:day,week,month,year',
            'detail'    => 'nullable|in:summary,detailed',
            'format'    => 'nullable|in:pdf,excel,csv',
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

        $income = 0; $expense = 0;
        foreach ($movements as $m) {
            $isEntry = strtolower($m->movementType->operation_type ?? '') === 'entrada' || (float)$m->amount > 0;
            if ($isEntry) { $income += (float)abs($m->amount); } else { $expense += (float)abs($m->amount); }
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
                $dayIncome = 0; $dayExpense = 0;
                foreach ($dayMovs as $dm) {
                    $isEntry = strtolower($dm->movementType->operation_type ?? '') === 'entrada' || (float)$dm->amount > 0;
                    if ($isEntry) { $dayIncome += (float)abs($dm->amount); } else { $dayExpense += (float)abs($dm->amount); }
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

        $filenameBase = 'reporte_financiero_'.$period;

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
            return $pdf->download($filenameBase.'.pdf');
        }

        if ($format === 'excel') {
            // Build a combined HTML with summary and optional detail table
            $summaryHeaders = ['Período','Desde','Hasta','Ingresos','Egresos','Neto'];
            $summaryRows = [[
                $period,
                $from->format('d/m/Y'),
                $to->format('d/m/Y'),
                number_format($income, 2, '.', ''),
                number_format($expense, 2, '.', ''),
                number_format($net, 2, '.', ''),
            ]];
            $html = $this->buildHtmlTable('Resumen Financiero', $summaryHeaders, $summaryRows);
            if ($detail === 'detailed') {
                $detailHeaders = ['Fecha','Ingresos','Egresos','Neto'];
                $html .= $this->buildHtmlTable('Detalle por Día', $detailHeaders, $rowsDetailed);
            }
            return response($html, 200, [
                'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="'.$filenameBase.'.xls"',
            ]);
        }

        // CSV
        $response = new StreamedResponse(function () use ($period, $from, $to, $income, $expense, $net, $detail, $rowsDetailed) {
            $handle = fopen('php://output', 'w');
            // Summary first
            fputcsv($handle, ['Período','Desde','Hasta','Ingresos','Egresos','Neto']);
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
                fputcsv($handle, ['Fecha','Ingresos','Egresos','Neto']);
                foreach ($rowsDetailed as $r) {
                    fputcsv($handle, [$r['fecha'], $r['ingresos'], $r['egresos'], $r['neto']]);
                }
            }
            fclose($handle);
        });
        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="'.$filenameBase.'.csv"');
        return $response;
    }

    /**
     * Obtener métodos de pago categorizados para optimización frontend
     */
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

            foreach ($cashKeywords as $keyword) {
                if (strpos($name, $keyword) !== false) {
                    $category = 'cash';
                    break;
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
        $thead = '<tr>'.collect($headers)->map(fn($h) => '<th style="border:1px solid #ccc;padding:6px;text-align:left">'.e($h).'</th>')->implode('').'</tr>';
        $tbody = '';
        foreach ($rows as $row) {
            $values = is_array($row) ? $row : array_values($row);
            $tbody .= '<tr>'.collect($values)->map(fn($v) => '<td style="border:1px solid #eee;padding:6px">'.e((string)$v).'</td>')->implode('').'</tr>';
        }
        return '<html><head><meta charset="UTF-8"></head><body>'
            .'<h3 style="margin:0 0 10px 0;">'.e($title).'</h3>'
            .'<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:Arial, sans-serif;font-size:12px">'
            .'<thead style="background:#f3f4f6">'.$thead.'</thead>'
            .'<tbody>'.$tbody.'</tbody>'
            .'</table>'
            .'</body></html>';
    }
}
