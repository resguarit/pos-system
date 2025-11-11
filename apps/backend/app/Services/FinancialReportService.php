<?php

namespace App\Services;

use App\Models\SaleHeader;
use App\Models\PurchaseOrder;
use App\Models\CashMovement;
use App\Models\MovementType;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinancialReportService
{
    /**
     * Obtener resumen financiero (ingresos - egresos) en un rango de fechas
     * 
     * @param Request $request
     * @return array
     */
    public function getFinancialSummary(Request $request): array
    {
        $branchIds = $request->input('branch_id');
        $fromInput = $request->input('from_date') ?? $request->input('from');
        $toInput = $request->input('to_date') ?? $request->input('to');

        // Parsear fechas
        $from = $fromInput ? Carbon::parse($fromInput)->startOfDay() : Carbon::now()->startOfMonth();
        $to = $toInput ? Carbon::parse($toInput)->endOfDay() : Carbon::now()->endOfDay();

        // Calcular ingresos
        $income = $this->calculateIncome($from, $to, $branchIds);

        // Calcular egresos
        $expenses = $this->calculateExpenses($from, $to, $branchIds);

        // Calcular balance
        $balance = $income['total'] - $expenses['total'];

        return [
            'period' => [
                'from' => $from->format('Y-m-d'),
                'to' => $to->format('Y-m-d'),
            ],
            'income' => $income,
            'expenses' => $expenses,
            'balance' => round($balance, 2),
            'balance_percentage' => $income['total'] > 0 
                ? round(($balance / $income['total']) * 100, 2) 
                : 0,
        ];
    }

    /**
     * Calcular ingresos totales
     * 
     * @param Carbon $from
     * @param Carbon $to
     * @param mixed $branchIds
     * @return array
     */
    private function calculateIncome(Carbon $from, Carbon $to, $branchIds): array
    {
        // Ingresos por ventas
        $salesQuery = SaleHeader::with('receiptType')
            ->whereBetween('date', [$from, $to])
            ->where('status', '!=', 'annulled');

        if ($branchIds) {
            if (is_array($branchIds)) {
                if (count($branchIds) > 0) {
                    $salesQuery->whereIn('branch_id', $branchIds);
                }
            } else {
                $salesQuery->where('branch_id', $branchIds);
            }
        }

        $allSales = $salesQuery->get();
        
        // Filtrar presupuestos (código AFIP 016)
        $financialSales = $allSales->filter(function ($sale) {
            return !($sale->receiptType && $sale->receiptType->afip_code === '016');
        });

        $salesTotal = $financialSales->sum('total');
        $salesCount = $financialSales->count();

        // Ingresos por movimientos de caja (entradas)
        // Excluir movimientos relacionados con ventas para evitar doble contabilización
        // ya que las ventas ya se están contando en la sección de "sales"
        // Solo incluir movimientos que afectan el balance (affects_balance = true o NULL)
        $cashMovementsQuery = CashMovement::with('movementType')
            ->whereHas('movementType', function ($query) {
                $query->where('operation_type', 'entrada')
                    ->where('is_cash_movement', true);
            })
            ->where(function ($query) {
                $query->where('reference_type', '!=', 'sale')
                    ->orWhereNull('reference_type');
            })
            ->where(function ($query) {
                $query->where('affects_balance', true)
                    ->orWhereNull('affects_balance');
            })
            ->whereBetween('created_at', [$from, $to]);

        if ($branchIds) {
            $cashMovementsQuery->whereHas('cashRegister', function ($query) use ($branchIds) {
                if (is_array($branchIds)) {
                    if (count($branchIds) > 0) {
                        $query->whereIn('branch_id', $branchIds);
                    }
                } else {
                    $query->where('branch_id', $branchIds);
                }
            });
        }

        $cashIncomeMovements = $cashMovementsQuery->get();
        $cashIncomeTotal = $cashIncomeMovements->sum('amount');
        $cashIncomeCount = $cashIncomeMovements->count();

        $totalIncome = $salesTotal + $cashIncomeTotal;

        return [
            'sales' => [
                'total' => round($salesTotal, 2),
                'count' => $salesCount,
            ],
            'cash_movements' => [
                'total' => round($cashIncomeTotal, 2),
                'count' => $cashIncomeCount,
            ],
            'total' => round($totalIncome, 2),
        ];
    }

    /**
     * Calcular egresos totales
     * 
     * @param Carbon $from
     * @param Carbon $to
     * @param mixed $branchIds
     * @return array
     */
    private function calculateExpenses(Carbon $from, Carbon $to, $branchIds): array
    {
        // Egresos por compras
        $purchasesQuery = PurchaseOrder::where('status', 'completed')
            ->where('affects_cash_register', true)
            ->whereBetween('order_date', [$from, $to]);

        if ($branchIds) {
            if (is_array($branchIds)) {
                if (count($branchIds) > 0) {
                    $purchasesQuery->whereIn('branch_id', $branchIds);
                }
            } else {
                $purchasesQuery->where('branch_id', $branchIds);
            }
        }

        $purchases = $purchasesQuery->get();
        $purchasesTotal = $purchases->sum('total_amount');
        $purchasesCount = $purchases->count();

        // Egresos por movimientos de caja (salidas)
        // Excluir movimientos relacionados con órdenes de compra para evitar doble contabilización
        // ya que las compras ya se están contando en la sección de "purchases"
        // Solo incluir movimientos que afectan el balance (affects_balance = true o NULL)
        $cashMovementsQuery = CashMovement::with('movementType')
            ->whereHas('movementType', function ($query) {
                $query->where('operation_type', 'salida')
                    ->where('is_cash_movement', true);
            })
            ->where(function ($query) {
                $query->where('reference_type', '!=', 'purchase_order')
                    ->orWhereNull('reference_type');
            })
            ->where(function ($query) {
                $query->where('affects_balance', true)
                    ->orWhereNull('affects_balance');
            })
            ->whereBetween('created_at', [$from, $to]);

        if ($branchIds) {
            $cashMovementsQuery->whereHas('cashRegister', function ($query) use ($branchIds) {
                if (is_array($branchIds)) {
                    if (count($branchIds) > 0) {
                        $query->whereIn('branch_id', $branchIds);
                    }
                } else {
                    $query->where('branch_id', $branchIds);
                }
            });
        }

        $cashExpenseMovements = $cashMovementsQuery->get();
        $cashExpenseTotal = $cashExpenseMovements->sum('amount');
        $cashExpenseCount = $cashExpenseMovements->count();

        $totalExpenses = $purchasesTotal + $cashExpenseTotal;

        return [
            'purchases' => [
                'total' => round($purchasesTotal, 2),
                'count' => $purchasesCount,
            ],
            'cash_movements' => [
                'total' => round($cashExpenseTotal, 2),
                'count' => $cashExpenseCount,
            ],
            'total' => round($totalExpenses, 2),
        ];
    }

    /**
     * Obtener desglose detallado de movimientos de entrada y salida
     * 
     * @param Request $request
     * @return array
     */
    public function getMovementsDetail(Request $request): array
    {
        $branchIds = $request->input('branch_id');
        $fromInput = $request->input('from_date') ?? $request->input('from');
        $toInput = $request->input('to_date') ?? $request->input('to');

        $from = $fromInput ? Carbon::parse($fromInput)->startOfDay() : Carbon::now()->startOfMonth();
        $to = $toInput ? Carbon::parse($toInput)->endOfDay() : Carbon::now()->endOfDay();

        // Movimientos de entrada
        // Excluir movimientos relacionados con ventas para evitar duplicación
        // ya que las ventas ya se muestran en la sección "sales_detail"
        // Solo incluir movimientos que afectan el balance (affects_balance = true o NULL)
        $incomeMovementsQuery = CashMovement::with(['movementType', 'user', 'cashRegister.branch'])
            ->whereHas('movementType', function ($query) {
                $query->where('operation_type', 'entrada')
                    ->where('is_cash_movement', true);
            })
            ->where(function ($query) {
                $query->where('reference_type', '!=', 'sale')
                    ->orWhereNull('reference_type');
            })
            ->where(function ($query) {
                $query->where('affects_balance', true)
                    ->orWhereNull('affects_balance');
            })
            ->whereBetween('created_at', [$from, $to]);

        if ($branchIds) {
            $incomeMovementsQuery->whereHas('cashRegister', function ($query) use ($branchIds) {
                if (is_array($branchIds)) {
                    if (count($branchIds) > 0) {
                        $query->whereIn('branch_id', $branchIds);
                    }
                } else {
                    $query->where('branch_id', $branchIds);
                }
            });
        }

        $incomeMovements = $incomeMovementsQuery->orderBy('created_at', 'desc')->get();

        // Movimientos de salida
        // Excluir movimientos relacionados con órdenes de compra para evitar duplicación
        // ya que las compras ya se muestran en la sección "purchases_detail"
        // Solo incluir movimientos que afectan el balance (affects_balance = true o NULL)
        $expenseMovementsQuery = CashMovement::with(['movementType', 'user', 'cashRegister.branch'])
            ->whereHas('movementType', function ($query) {
                $query->where('operation_type', 'salida')
                    ->where('is_cash_movement', true);
            })
            ->where(function ($query) {
                $query->where('reference_type', '!=', 'purchase_order')
                    ->orWhereNull('reference_type');
            })
            ->where(function ($query) {
                $query->where('affects_balance', true)
                    ->orWhereNull('affects_balance');
            })
            ->whereBetween('created_at', [$from, $to]);

        if ($branchIds) {
            $expenseMovementsQuery->whereHas('cashRegister', function ($query) use ($branchIds) {
                if (is_array($branchIds)) {
                    if (count($branchIds) > 0) {
                        $query->whereIn('branch_id', $branchIds);
                    }
                } else {
                    $query->where('branch_id', $branchIds);
                }
            });
        }

        $expenseMovements = $expenseMovementsQuery->orderBy('created_at', 'desc')->get();

        // Ventas detalladas
        $salesQuery = SaleHeader::with(['receiptType', 'branch', 'customer', 'user'])
            ->whereBetween('date', [$from, $to])
            ->where('status', '!=', 'annulled');

        if ($branchIds) {
            if (is_array($branchIds)) {
                if (count($branchIds) > 0) {
                    $salesQuery->whereIn('branch_id', $branchIds);
                }
            } else {
                $salesQuery->where('branch_id', $branchIds);
            }
        }

        $allSales = $salesQuery->orderBy('date', 'desc')->get();
        
        // Filtrar presupuestos (código AFIP 016)
        $financialSales = $allSales->filter(function ($sale) {
            return !($sale->receiptType && $sale->receiptType->afip_code === '016');
        });

        // Compras detalladas
        $purchasesQuery = PurchaseOrder::with(['supplier.person', 'branch'])
            ->where('status', 'completed')
            ->where('affects_cash_register', true)
            ->whereBetween('order_date', [$from, $to]);

        if ($branchIds) {
            if (is_array($branchIds)) {
                if (count($branchIds) > 0) {
                    $purchasesQuery->whereIn('branch_id', $branchIds);
                }
            } else {
                $purchasesQuery->where('branch_id', $branchIds);
            }
        }

        $purchases = $purchasesQuery->orderBy('order_date', 'desc')->get();

        return [
            'income_movements' => $incomeMovements->map(function ($movement) {
                return [
                    'id' => $movement->id,
                    'amount' => round((float) $movement->amount, 2),
                    'description' => $movement->description,
                    'movement_type' => $movement->movementType ? $movement->movementType->name : null,
                    'user' => $movement->user ? ($movement->user->person ? $movement->user->person->first_name . ' ' . $movement->user->person->last_name : $movement->user->username) : null,
                    'branch' => $movement->cashRegister && $movement->cashRegister->branch ? $movement->cashRegister->branch->description : null,
                    'created_at' => $movement->created_at->format('Y-m-d H:i:s'),
                    'date' => $movement->created_at->format('Y-m-d'),
                ];
            })->toArray(),
            'expense_movements' => $expenseMovements->map(function ($movement) {
                return [
                    'id' => $movement->id,
                    'amount' => round((float) $movement->amount, 2),
                    'description' => $movement->description,
                    'movement_type' => $movement->movementType ? $movement->movementType->name : null,
                    'user' => $movement->user ? ($movement->user->person ? $movement->user->person->first_name . ' ' . $movement->user->person->last_name : $movement->user->username) : null,
                    'branch' => $movement->cashRegister && $movement->cashRegister->branch ? $movement->cashRegister->branch->description : null,
                    'created_at' => $movement->created_at->format('Y-m-d H:i:s'),
                    'date' => $movement->created_at->format('Y-m-d'),
                ];
            })->toArray(),
            'sales_detail' => $financialSales->map(function ($sale) {
                $customerName = $sale->customer 
                    ? ($sale->customer->person 
                        ? $sale->customer->person->first_name . ' ' . $sale->customer->person->last_name 
                        : ($sale->customer->business_name ?? '-'))
                    : '-';
                
                $userName = $sale->user 
                    ? ($sale->user->person 
                        ? $sale->user->person->first_name . ' ' . $sale->user->person->last_name 
                        : $sale->user->username)
                    : null;

                return [
                    'id' => $sale->id,
                    'total' => round((float) $sale->total, 2),
                    'receipt_number' => $sale->receipt_number,
                    'receipt_type' => $sale->receiptType ? $sale->receiptType->name : null,
                    'customer' => $customerName,
                    'branch' => $sale->branch ? $sale->branch->description : null,
                    'user' => $userName,
                    'date' => $sale->date->format('Y-m-d'),
                    'created_at' => $sale->date->format('Y-m-d H:i:s'),
                ];
            })->toArray(),
            'purchases_detail' => $purchases->map(function ($purchase) {
                $supplierName = '-';
                if ($purchase->supplier) {
                    if ($purchase->supplier->person) {
                        $supplierName = $purchase->supplier->person->first_name . ' ' . $purchase->supplier->person->last_name;
                    } elseif ($purchase->supplier->name) {
                        $supplierName = $purchase->supplier->name;
                    }
                }

                return [
                    'id' => $purchase->id,
                    'total_amount' => round((float) $purchase->total_amount, 2),
                    'supplier' => $supplierName,
                    'branch' => $purchase->branch ? $purchase->branch->description : null,
                    'order_date' => $purchase->order_date->format('Y-m-d'),
                    'currency' => $purchase->currency ?? 'ARS',
                    'notes' => $purchase->notes,
                ];
            })->toArray(),
        ];
    }

    /**
     * Obtener desglose diario del resumen financiero
     * 
     * @param Request $request
     * @return array
     */
    public function getDailyBreakdown(Request $request): array
    {
        $branchIds = $request->input('branch_id');
        $fromInput = $request->input('from_date') ?? $request->input('from');
        $toInput = $request->input('to_date') ?? $request->input('to');

        $from = $fromInput ? Carbon::parse($fromInput)->startOfDay() : Carbon::now()->startOfMonth();
        $to = $toInput ? Carbon::parse($toInput)->endOfDay() : Carbon::now()->endOfDay();

        $dailyData = [];

        $currentDate = $from->copy();
        while ($currentDate <= $to) {
            $dayStart = $currentDate->copy()->startOfDay();
            $dayEnd = $currentDate->copy()->endOfDay();

            $dayIncome = $this->calculateIncome($dayStart, $dayEnd, $branchIds);
            $dayExpenses = $this->calculateExpenses($dayStart, $dayEnd, $branchIds);
            $dayBalance = $dayIncome['total'] - $dayExpenses['total'];

            $dailyData[] = [
                'date' => $currentDate->format('Y-m-d'),
                'income' => $dayIncome['total'],
                'expenses' => $dayExpenses['total'],
                'balance' => round($dayBalance, 2),
            ];

            $currentDate->addDay();
        }

        return $dailyData;
    }
}

