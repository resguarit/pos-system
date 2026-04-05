<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Expense;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\MovementType;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ExpenseService
{
    protected ExpenseReminderService $expenseReminderService;

    public function __construct(ExpenseReminderService $expenseReminderService)
    {
        $this->expenseReminderService = $expenseReminderService;
    }

    public function createExpense(array $data): Expense
    {
        $data['user_id'] = Auth::id();
        $data['status'] = $data['status'] ?? 'pending';

        return DB::transaction(function () use ($data) {
            $expense = Expense::create($data);

            if ($expense->status === 'paid') {
                $this->processPayment($expense);
            }

            // Create reminder if expense is recurring
            if ($expense->is_recurring && $expense->recurrence_interval) {
                $this->expenseReminderService->createReminderForExpense($expense);
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
            $expense->fill($data);
            $expense->save();

            if ($expense->status === 'paid' && !$expense->cash_movement_id) {
                $this->processPayment($expense);
            }

            // Update or create reminder if expense is recurring
            if ($expense->is_recurring && $expense->recurrence_interval) {
                // Delete old reminders
                $expense->reminders()->delete();
                // Create new reminder with updated settings
                $this->expenseReminderService->createReminderForExpense($expense);
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
        $startDate = isset($filters['start_date']) ? Carbon::parse($filters['start_date'])->startOfDay() : null;
        $endDate = isset($filters['end_date']) ? Carbon::parse($filters['end_date'])->endOfDay() : null;

        $query = Expense::query();

        $this->applyBranchScopeToQuery($query, $filters);

        $byBranch = [];
        $normalizedBranchIds = $this->normalizeBranchIdsFromFilters($filters);
        if ($normalizedBranchIds !== null && count($normalizedBranchIds) >= 2) {
            $rows = (clone $query)
                ->select('branch_id')
                ->selectRaw('SUM(CASE WHEN status = ? THEN amount ELSE 0 END) as total_paid', ['paid'])
                ->selectRaw('SUM(CASE WHEN status IN (?, ?) THEN amount ELSE 0 END) as total_open', ['pending', 'approved'])
                ->groupBy('branch_id')
                ->orderBy('branch_id')
                ->get();

            $branchMeta = Branch::whereIn('id', $rows->pluck('branch_id'))
                ->get(['id', 'description', 'color'])
                ->keyBy('id');

            $byBranch = $rows->map(function ($row) use ($branchMeta) {
                $meta = $branchMeta->get($row->branch_id);

                return [
                    'branch_id' => (int) $row->branch_id,
                    'name' => $meta?->description ?? ('Sucursal '.$row->branch_id),
                    'color' => $meta?->color,
                    'total_paid' => (float) $row->total_paid,
                    'total_open' => (float) $row->total_open,
                ];
            })->values()->all();
        }
        if ($startDate) {
            $query->whereDate('date', '>=', $startDate->toDateString());
        }
        if ($endDate) {
            $query->whereDate('date', '<=', $endDate->toDateString());
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

        $byCategoryMap = [];
        foreach ($byCategory as $item) {
            $byCategoryMap[$item['name']] = ($byCategoryMap[$item['name']] ?? 0) + $item['value'];
        }

        // Por mes (últimos 6 meses si no hay filtro de fecha) - solo gastos pagados
        $monthlyQuery = (clone $query)->where('status', 'paid');
        if (!$startDate) {
            $monthlyQuery->whereDate('date', '>=', now()->subMonths(6));
        }
        $monthlyStatsMap = $monthlyQuery
            ->select(DB::raw("DATE_FORMAT(date, '%Y-%m') as month"), DB::raw('sum(amount) as total'))
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->mapWithKeys(function ($item) {
                return [
                    $item->month => [
                        'month' => $item->month,
                        'total' => (float) $item->total,
                        'projected' => 0,
                    ],
                ];
            })
            ->toArray();

        if ($startDate && $endDate) {
            $projection = $this->calculateRecurringProjectionForRange($filters, $startDate, $endDate);

            foreach ($projection['by_month'] as $month => $projectedValue) {
                if (!isset($monthlyStatsMap[$month])) {
                    $monthlyStatsMap[$month] = [
                        'month' => $month,
                        'total' => 0,
                        'projected' => 0,
                    ];
                }

                $monthlyStatsMap[$month]['projected'] = round(
                    $monthlyStatsMap[$month]['projected'] + $projectedValue,
                    2
                );
            }

            foreach ($projection['by_category'] as $categoryName => $projectedValue) {
                $byCategoryMap[$categoryName] = round(($byCategoryMap[$categoryName] ?? 0) + $projectedValue, 2);
            }

            $this->ensureMonthlyRangeEntries($monthlyStatsMap, $startDate, $endDate);
        }

        $monthlyStats = collect($monthlyStatsMap)
            ->sortBy('month')
            ->map(function ($item) {
                return [
                    'month' => $item['month'],
                    'total' => (float) $item['total'],
                    'projected' => (float) ($item['projected'] ?? 0),
                ];
            });

        if (!$startDate && !$endDate) {
            // Calculate projection for the next month when there is no explicit date range.
            try {
                $lastMonthDate = $monthlyStats->isNotEmpty()
                    ? Carbon::createFromFormat('Y-m', $monthlyStats->last()['month'])
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
                $this->applyBranchScopeToQuery($projectionQuery, $filters);
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
        }

        $byMonth = $monthlyStats->values();
        $byCategory = collect($byCategoryMap)
            ->map(function ($value, $name) {
                return [
                    'name' => $name,
                    'value' => (float) round($value, 2),
                ];
            })
            ->sortByDesc('value')
            ->values();

        return [
            'by_category' => $byCategory,
            'by_month' => $byMonth,
            'by_branch' => $byBranch,
        ];
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     */
    private function applyBranchScopeToQuery($query, array $filters): void
    {
        $ids = $this->normalizeBranchIdsFromFilters($filters);
        if ($ids === null) {
            return;
        }
        if (count($ids) === 1) {
            $query->where('branch_id', $ids[0]);
        } else {
            $query->whereIn('branch_id', $ids);
        }
    }

    /**
     * @return int[]|null
     */
    private function normalizeBranchIdsFromFilters(array $filters): ?array
    {
        if (! empty($filters['branch_ids']) && is_array($filters['branch_ids'])) {
            $ids = array_values(array_unique(array_map(
                'intval',
                array_filter($filters['branch_ids'], fn ($v) => $v !== '' && $v !== null)
            )));
            if (count($ids) > 0) {
                return $ids;
            }
        }

        if (array_key_exists('branch_id', $filters) && $filters['branch_id'] !== null && $filters['branch_id'] !== '') {
            $bid = $filters['branch_id'];
            if (is_array($bid)) {
                $ids = array_values(array_unique(array_map(
                    'intval',
                    array_filter($bid, fn ($v) => $v !== '' && $v !== null)
                )));

                return count($ids) ? $ids : null;
            }

            return [(int) $bid];
        }

        return null;
    }

    private function calculateRecurringProjectionForRange(array $filters, Carbon $startDate, Carbon $endDate): array
    {
        $query = Expense::with('category:id,name')
            ->where('is_recurring', true)
            ->where('status', '!=', 'cancelled')
            ->whereDate('date', '<=', $endDate->toDateString());

        $this->applyBranchScopeToQuery($query, $filters);

        $recurringTemplates = $query->get();
        $projectedByMonth = [];
        $projectedByCategory = [];

        foreach ($recurringTemplates as $expense) {
            $currentDate = Carbon::parse($expense->date)->startOfDay();
            if ($currentDate->gt($endDate)) {
                continue;
            }

            $iterations = 0;
            while ($currentDate->lte($endDate) && $iterations < 1000) {
                if ($currentDate->gte($startDate)) {
                    $monthKey = $currentDate->format('Y-m');
                    $categoryName = $expense->category ? $expense->category->name : 'Sin categoría';
                    $amount = (float) $expense->amount;

                    $projectedByMonth[$monthKey] = ($projectedByMonth[$monthKey] ?? 0) + $amount;
                    $projectedByCategory[$categoryName] = ($projectedByCategory[$categoryName] ?? 0) + $amount;
                }

                $nextDate = $this->getNextRecurringOccurrence($currentDate, $expense->recurrence_interval);
                if (!$nextDate || $nextDate->lte($currentDate)) {
                    break;
                }

                $currentDate = $nextDate;
                $iterations++;
            }
        }

        return [
            'by_month' => $projectedByMonth,
            'by_category' => $projectedByCategory,
        ];
    }

    private function getNextRecurringOccurrence(Carbon $currentDate, ?string $interval): ?Carbon
    {
        $normalizedInterval = strtolower((string) ($interval ?? 'monthly'));

        return match ($normalizedInterval) {
            'daily' => $currentDate->copy()->addDay(),
            'weekly' => $currentDate->copy()->addWeek(),
            'monthly' => $currentDate->copy()->addMonth(),
            'yearly', 'annual' => $currentDate->copy()->addYear(),
            default => $currentDate->copy()->addMonth(),
        };
    }

    private function ensureMonthlyRangeEntries(array &$monthlyStatsMap, Carbon $startDate, Carbon $endDate): void
    {
        $cursor = $startDate->copy()->startOfMonth();
        $lastMonth = $endDate->copy()->startOfMonth();

        while ($cursor->lte($lastMonth)) {
            $monthKey = $cursor->format('Y-m');
            if (!isset($monthlyStatsMap[$monthKey])) {
                $monthlyStatsMap[$monthKey] = [
                    'month' => $monthKey,
                    'total' => 0,
                    'projected' => 0,
                ];
            }

            $cursor->addMonth();
        }
    }
}
