<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Http\Requests\Expenses\StoreExpenseRequest;
use App\Http\Requests\Expenses\UpdateExpenseRequest;
use App\Services\ExpenseService;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    protected $expenseService;

    public function __construct(ExpenseService $expenseService)
    {
        $this->expenseService = $expenseService;
    }

    public function index(Request $request)
    {
        $query = Expense::with(['category.parent', 'employee.person', 'branch', 'paymentMethod', 'user.person']);
        $includeRecurringProjectionSources = $request->boolean('include_recurring_projection_sources', false);

        // Search functionality
        if ($request->has('search') && $request->search) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('description', 'like', "%{$searchTerm}%")
                    ->orWhereHas('category', function ($q) use ($searchTerm) {
                        $q->where('name', 'like', "%{$searchTerm}%");
                    })
                    ->orWhereHas('employee.person', function ($q) use ($searchTerm) {
                        $q->where('first_name', 'like', "%{$searchTerm}%")
                            ->orWhere('last_name', 'like', "%{$searchTerm}%");
                    });
            });
        }

        $this->applyExpenseBranchScope($query, $request);

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('employee_id') && $request->employee_id !== null && $request->employee_id !== '') {
            $query->where('employee_id', (int) $request->employee_id);
        }

        if ($request->has('month') && $request->month !== null && $request->month !== '') {
            $query->whereMonth('date', (int) $request->month);
        }

        if ($request->has('year') && $request->year !== null && $request->year !== '') {
            $query->whereYear('date', (int) $request->year);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('start_date') || $request->has('end_date')) {
            $query->where(function ($q) use ($request, $includeRecurringProjectionSources) {
                // Include normal expenses in the date range
                $q->where(function ($q2) use ($request) {
                    if ($request->has('start_date')) {
                        $q2->whereDate('date', '>=', $request->start_date);
                    }
                    if ($request->has('end_date')) {
                        $q2->whereDate('date', '<=', $request->end_date);
                    }
                });

                if ($includeRecurringProjectionSources) {
                    // Optionally include recurring templates that started before the selected end date.
                    // This is used by the calendar to project future occurrences.
                    $q->orWhere(function ($q3) use ($request) {
                        $q3->where('is_recurring', true)
                            ->where('status', '!=', 'cancelled');
                        if ($request->has('end_date')) {
                            $q3->whereDate('date', '<=', $request->end_date);
                        }
                    });
                }
            });
        }

        if ($request->has('is_recurring')) {
            $query->where('is_recurring', $request->boolean('is_recurring'));
        }

        $perPage = $request->input('limit', $request->input('per_page', 15));
        $expenses = $query->latest('date')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $expenses->items(),
            'current_page' => $expenses->currentPage(),
            'last_page' => $expenses->lastPage(),
            'per_page' => $expenses->perPage(),
            'total' => $expenses->total(),
        ]);
    }

    public function stats(Request $request)
    {
        $stats = $this->expenseService->getExpenseStats($request->all());

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    public function recent(Request $request)
    {
        $expenses = Expense::where('user_id', auth()->id())
            ->with(['category', 'category.parent'])
            ->latest()
            ->take(50) // Take enough recent expenses to find uniques
            ->get()
            ->unique('category_id') // Deduplicate by category
            ->take(6) // Take top 6 unique categories
            ->values();

        return response()->json([
            'success' => true,
            'data' => $expenses
        ]);
    }

    public function store(StoreExpenseRequest $request)
    {
        try {
            $expense = $this->expenseService->createExpense($request->validated());

            return response()->json([
                'success' => true,
                'message' => 'Expense created successfully',
                'data' => $expense->load(['category', 'employee.person', 'branch', 'user.person'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $expense = Expense::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $expense->load(['category', 'employee.person', 'branch', 'paymentMethod', 'user.person', 'cashMovement'])
        ]);
    }

    public function update(UpdateExpenseRequest $request, $id)
    {
        $expense = Expense::findOrFail($id);

        if ($expense->status === 'paid' && $expense->cash_movement_id) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot update a paid expense. Cancel it instead.'
            ], 422);
        }

        try {
            $updatedExpense = $this->expenseService->updateExpense($expense, $request->validated());

            return response()->json([
                'success' => true,
                'message' => 'Expense updated successfully',
                'data' => $updatedExpense->load(['category', 'employee.person', 'branch', 'user.person'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        $expense = Expense::findOrFail($id);

        try {
            $this->expenseService->deleteExpense($expense);

            return response()->json([
                'success' => true,
                'message' => 'Expense deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder|\Illuminate\Database\Eloquent\Relations\Relation  $query
     */
    private function applyExpenseBranchScope($query, Request $request): void
    {
        $ids = $this->normalizeExpenseBranchIdsFromRequest($request);
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
    private function normalizeExpenseBranchIdsFromRequest(Request $request): ?array
    {
        $raw = $request->input('branch_ids');
        if (is_string($raw) && $raw !== '') {
            $ids = array_filter(array_map('intval', explode(',', $raw)));
            return count($ids) ? array_values(array_unique($ids)) : null;
        }
        if (is_array($raw) && count($raw) > 0) {
            $ids = array_values(array_unique(array_map('intval', array_filter($raw, fn ($v) => $v !== '' && $v !== null))));
            return count($ids) ? $ids : null;
        }

        if (!$request->has('branch_id')) {
            return null;
        }

        $branchId = $request->input('branch_id');
        if ($branchId === null || $branchId === '') {
            return null;
        }
        if (is_array($branchId)) {
            $ids = array_values(array_unique(array_map('intval', array_filter($branchId, fn ($v) => $v !== '' && $v !== null))));

            return count($ids) ? $ids : null;
        }

        return [(int) $branchId];
    }
}
