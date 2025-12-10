<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\MovementType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ExpenseController extends Controller
{
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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'due_date' => 'nullable|date',
            'category_id' => 'required|exists:expense_categories,id',
            'branch_id' => 'required|exists:branches,id',
            'employee_id' => 'nullable|exists:employees,id',
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'is_recurring' => 'boolean',
            'recurrence_interval' => 'nullable|string|in:daily,weekly,monthly,yearly',
            'status' => 'in:pending,approved,paid,cancelled',
        ]);

        $validated['user_id'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'pending';

        DB::beginTransaction();
        try {
            $expense = Expense::create($validated);

            if ($expense->status === 'paid') {
                $this->processPayment($expense);
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Expense created successfully',
                'data' => $expense->load(['category', 'employee.person', 'branch'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
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

    public function update(Request $request, Expense $expense)
    {
        if ($expense->status === 'paid' && $expense->cash_movement_id) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot update a paid expense. Cancel it instead.'
            ], 422);
        }

        $validated = $request->validate([
            'description' => 'sometimes|string|max:255',
            'amount' => 'sometimes|numeric|min:0',
            'date' => 'sometimes|date',
            'due_date' => 'nullable|date',
            'category_id' => 'sometimes|exists:expense_categories,id',
            'branch_id' => 'sometimes|exists:branches,id',
            'employee_id' => 'nullable|exists:employees,id',
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'is_recurring' => 'boolean',
            'recurrence_interval' => 'nullable|string|in:daily,weekly,monthly,yearly',
            'status' => 'in:pending,approved,paid,cancelled',
        ]);

        DB::beginTransaction();
        try {
            $expense->update($validated);

            if ($expense->status === 'paid' && !$expense->cash_movement_id) {
                $this->processPayment($expense);
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Expense updated successfully',
                'data' => $expense->load(['category', 'employee.person', 'branch'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Expense $expense)
    {
        DB::beginTransaction();
        try {
            // If expense is paid and has a cash movement, reverse it
            if ($expense->status === 'paid' && $expense->cash_movement_id) {
                $cashMovement = CashMovement::find($expense->cash_movement_id);

                if ($cashMovement) {
                    // Check if cash register is open
                    if (!$cashMovement->cashRegister->isOpen()) {
                        throw new \Exception('No se puede eliminar un gasto pagado de una caja cerrada.');
                    }

                    // Delete movement and update cash register balance
                    // We can use the service or replicate logic. Since we don't have the service injected here easily without refactor,
                    // we will replicate the critical logic: delete movement -> update calculated fields.

                    $cashRegister = $cashMovement->cashRegister;
                    $cashMovement->delete();
                    $cashRegister->updateCalculatedFields();
                }
            }

            $expense->delete();

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Expense deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function processPayment(Expense $expense)
    {
        // Find open cash register for the branch
        $cashRegister = CashRegister::where('branch_id', $expense->branch_id)
            ->where('status', 'open')
            ->latest()
            ->first();

        if (!$cashRegister) {
            throw new \Exception('No open cash register found for this branch.');
        }

        // Find or create movement type for Expense
        // Usamos 'Gastos del negocio'
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
            'affects_balance' => true, // Assuming expenses affect balance
            'reference_type' => 'expense',
            'reference_id' => $expense->id,
        ]);

        $expense->cash_movement_id = $cashMovement->id;
        $expense->save();
    }
}
