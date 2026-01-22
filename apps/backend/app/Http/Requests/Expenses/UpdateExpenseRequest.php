<?php

namespace App\Http\Requests\Expenses;

use Illuminate\Foundation\Http\FormRequest;

class UpdateExpenseRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
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
            'status' => 'sometimes|in:pending,approved,paid,cancelled',
        ];
    }
}
