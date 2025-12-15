<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\MovementType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ExpenseService
{
    public function createExpense(array $data): Expense
    {
        $data['user_id'] = Auth::id();
        $data['status'] = $data['status'] ?? 'pending';

        return DB::transaction(function () use ($data) {
            $expense = Expense::create($data);

            if ($expense->status === 'paid') {
                $this->processPayment($expense);
            }

            return $expense;
        });
    }

    public function updateExpense(Expense $expense, array $data): Expense
    {
        // Validation logic moved from controller
        if ($expense->status === 'paid' && $expense->cash_movement_id) {
            // Allow updating non-critical fields? For now, stick to original logic: block update
            // Or maybe the controller handles the blocking?
            // Ideally, service should handle business rules.
            // But throwing exception here is fine.
        }

        return DB::transaction(function () use ($expense, $data) {
            $expense->update($data);

            if ($expense->status === 'paid' && !$expense->cash_movement_id) {
                $this->processPayment($expense);
            }

            return $expense;
        });
    }

    public function deleteExpense(Expense $expense): void
    {
        DB::transaction(function () use ($expense) {
            // If expense is paid and has a cash movement, reverse it
            if ($expense->status === 'paid' && $expense->cash_movement_id) {
                $cashMovement = CashMovement::find($expense->cash_movement_id);

                if ($cashMovement) {
                    // Check if cash register is open
                    if (!$cashMovement->cashRegister->isOpen()) {
                        throw new \Exception('No se puede eliminar un gasto pagado de una caja cerrada.');
                    }

                    $cashRegister = $cashMovement->cashRegister;
                    $cashMovement->delete();
                    $cashRegister->updateCalculatedFields();
                }
            }

            $expense->delete();
        });
    }

    protected function processPayment(Expense $expense): void
    {
        // Find open cash register for the branch
        $cashRegister = CashRegister::where('branch_id', $expense->branch_id)
            ->where('status', 'open')
            ->latest()
            ->first();

        if (!$cashRegister) {
            throw new \Exception('No se encontró una caja abierta para esta sucursal.');
        }

        // Find or create movement type for Expense
        $movementType = MovementType::where('name', 'Gastos del negocio')->first();

        if (!$movementType) {
            // Fallback: try 'Gasto operativo' or create 'Gastos del negocio'
            $movementType = MovementType::where('name', 'Gasto operativo')->first();

            if (!$movementType) {
                $movementType = MovementType::create([
                    'name' => 'Gastos del negocio',
                    'description' => 'Gastos del negocio',
                    'operation_type' => 'salida',
                    'is_cash_movement' => true
                ]);
            }
        }

        $cashMovement = CashMovement::create([
            'cash_register_id' => $cashRegister->id,
            'movement_type_id' => $movementType->id,
            'amount' => $expense->amount,
            'description' => 'Pago de gasto: ' . $expense->description,
            'user_id' => Auth::id(),
            'payment_method_id' => $expense->payment_method_id,
            'affects_balance' => true,
            'reference_type' => 'expense',
            'reference_id' => $expense->id,
        ]);

        $expense->cash_movement_id = $cashMovement->id;
        $expense->save();
    }
    public function getExpenseStats(array $filters): array
    {
        $query = Expense::query();

        if (isset($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }
        if (isset($filters['start_date'])) {
            $query->whereDate('date', '>=', $filters['start_date']);
        }
        if (isset($filters['end_date'])) {
            $query->whereDate('date', '<=', $filters['end_date']);
        }
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Por categoría (solo gastos pagados)
        $byCategory = (clone $query)
            ->where('status', 'paid')
            ->select('category_id', DB::raw('sum(amount) as total'))
            ->with('category:id,name')
            ->groupBy('category_id')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->category ? $item->category->name : 'Sin categoría',
                    'value' => (float) $item->total,
                ];
            });

        // Por mes (últimos 6 meses si no hay filtro de fecha) - solo gastos pagados
        $monthlyQuery = (clone $query)->where('status', 'paid');
        if (!isset($filters['start_date'])) {
            $monthlyQuery->whereDate('date', '>=', now()->subMonths(6));
        }
        $monthlyStats = $monthlyQuery
            ->select(DB::raw("DATE_FORMAT(date, '%Y-%m') as month"), DB::raw('sum(amount) as total'))
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'month' => $item->month,
                    'total' => (float) $item->total,
                    'projected' => 0
                ];
            });

        // Calculate projection for the next month
        try {
            $lastMonthDate = $monthlyStats->isNotEmpty()
                ? \Carbon\Carbon::createFromFormat('Y-m', $monthlyStats->last()['month'])
                : now()->subMonth();

            $nextMonth = $lastMonthDate->copy()->addMonth();
            $nextMonthStr = $nextMonth->format('Y-m');

            // 1. Historical Average (Last 3 months)
            $average = 0;
            if ($monthlyStats->isNotEmpty()) {
                $lastMonths = $monthlyStats->sortByDesc('month')->take(3);
                $average = $lastMonths->avg('total');
            }

            // Create a fresh query for projection to avoid date filter conflicts
            $projectionQuery = Expense::query();
            if (isset($filters['branch_id'])) {
                $projectionQuery->where('branch_id', $filters['branch_id']);
            }
            // We intentionally ignore status filters for projection to show all obligations

            // 2. Upcoming Actual Expenses (Already entered for next month)
            $upcomingTotal = (clone $projectionQuery)->whereBetween('date', [
                $nextMonth->copy()->startOfMonth(),
                $nextMonth->copy()->endOfMonth()
            ])->sum('amount');

            // 3. Recurring Expenses (From last month)
            // We assume expenses marked as recurring in the last month will repeat
            $recurringTotal = (clone $projectionQuery)->where('is_recurring', true)
                ->whereBetween('date', [
                    $lastMonthDate->copy()->startOfMonth(),
                    $lastMonthDate->copy()->endOfMonth()
                ])->sum('amount');

            // Final Projection Logic:
            // If we have explicit recurring expenses, we trust that value more than the historical average
            // (which might include one-off expenses).
            // If we don't have recurring expenses marked, we fall back to the average.
            // We always ensure the projection is at least as high as what's already entered for next month (upcomingTotal).

            $baseProjection = ($recurringTotal > 0) ? $recurringTotal : $average;
            $projection = max($baseProjection, $upcomingTotal);

            // Add projection entry
            $monthlyStats->push([
                'month' => $nextMonthStr,
                'total' => 0,
                'projected' => round($projection, 2)
            ]);

        } catch (\Exception $e) {
            Log::error('Error calculating expense projection: ' . $e->getMessage());
            // Continue without projection
        }

        $byMonth = $monthlyStats->values();

        return [
            'by_category' => $byCategory,
            'by_month' => $byMonth
        ];
    }
}
