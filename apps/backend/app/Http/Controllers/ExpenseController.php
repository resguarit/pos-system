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
        $query = Expense::with(['category', 'employee.person', 'branch', 'paymentMethod', 'user']);

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

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('start_date')) {
            $query->whereDate('date', '>=', $request->start_date);
        }

        if ($request->has('end_date')) {
            $query->whereDate('date', '<=', $request->end_date);
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

    public function store(StoreExpenseRequest $request)
    {
        try {
            $expense = $this->expenseService->createExpense($request->validated());

            return response()->json([
                'success' => true,
                'message' => 'Expense created successfully',
                'data' => $expense->load(['category', 'employee.person', 'branch'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function show(Expense $expense)
    {
        return response()->json([
            'success' => true,
            'data' => $expense->load(['category', 'employee.person', 'branch', 'paymentMethod', 'user', 'cashMovement'])
        ]);
    }

    public function update(UpdateExpenseRequest $request, Expense $expense)
    {
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
                'data' => $updatedExpense->load(['category', 'employee.person', 'branch'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Expense $expense)
    {
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
}
