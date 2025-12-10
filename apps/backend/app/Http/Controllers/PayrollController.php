<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
    /**
     * Generate payroll expenses for all active employees.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2000|max:2100',
            'payment_date' => 'required|date',
            'due_date' => 'nullable|date',
            'category_id' => 'required|exists:expense_categories,id',
            'branch_id' => 'required|exists:branches,id',
        ]);

        return DB::transaction(function () use ($validated) {
            $employees = Employee::where('status', 'active')
                ->where('branch_id', $validated['branch_id'])
                ->get();

            $expenses = [];
            $totalAmount = 0;

            foreach ($employees as $employee) {
                // Check if payroll already exists for this employee/month/year
                // This is a basic check, could be more robust
                $exists = Expense::where('employee_id', $employee->id)
                    ->where('category_id', $validated['category_id'])
                    ->whereMonth('date', $validated['month'])
                    ->whereYear('date', $validated['year'])
                    ->exists();

                if ($exists) {
                    continue; // Skip if already generated
                }

                $description = "Sueldo " . $validated['month'] . "/" . $validated['year'] . " - " . $employee->person->first_name . " " . $employee->person->last_name;

                $expense = Expense::create([
                    'branch_id' => $validated['branch_id'],
                    'category_id' => $validated['category_id'],
                    'employee_id' => $employee->id,
                    'user_id' => Auth::id(),
                    'description' => $description,
                    'amount' => $employee->salary,
                    'date' => $validated['payment_date'], // Or end of month
                    'due_date' => $validated['due_date'] ?? $validated['payment_date'],
                    'status' => 'pending',
                    'is_recurring' => true,
                    'recurrence_interval' => 'monthly',
                ]);

                $expenses[] = $expense;
                $totalAmount += $employee->salary;
            }

            return response()->json([
                'message' => 'Payroll generated successfully',
                'count' => count($expenses),
                'total_amount' => $totalAmount,
                'expenses' => $expenses
            ], 201);
        });
    }
}
