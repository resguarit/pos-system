<?php

namespace App\Http\Requests\Expenses;

use App\Models\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;

class StoreExpenseRequest extends FormRequest
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
            'description' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'due_date' => 'nullable|date',
            'category_id' => 'required|exists:expense_categories,id',
            'branch_id' => 'required|exists:branches,id',
            'employee_id' => 'nullable|exists:employees,id',
            'payment_method_id' => [
                'nullable',
                'exists:payment_methods,id',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($value && PaymentMethod::find($value)?->name === 'Cuenta Corriente') {
                        $fail('Los gastos no pueden pagarse con Cuenta Corriente.');
                    }
                },
            ],
            'is_recurring' => 'boolean',
            'recurrence_interval' => 'nullable|string|in:daily,weekly,monthly,yearly',
            'status' => 'in:pending,approved,paid,cancelled',
        ];
    }
}
