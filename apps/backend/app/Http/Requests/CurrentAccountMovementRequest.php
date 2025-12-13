<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CurrentAccountMovementRequest extends FormRequest
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
     */
    public function rules(): array
    {
        return [
            'current_account_id' => 'required|integer|exists:current_accounts,id',
            'movement_type_id' => 'required|integer|exists:movement_types,id',
            'amount' => 'required|numeric|min:0|max:999999.99',
            'description' => 'required|string|max:500',
            'reference' => 'nullable|string|max:100',
            'sale_id' => 'nullable|integer|exists:sales_header,id',
            'metadata' => 'nullable|array',
            'movement_date' => 'nullable|date',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'current_account_id.required' => 'La cuenta corriente es requerida',
            'current_account_id.exists' => 'La cuenta corriente seleccionada no existe',
            'movement_type_id.required' => 'El tipo de movimiento es requerido',
            'movement_type_id.exists' => 'El tipo de movimiento seleccionado no existe',
            'amount.required' => 'El monto es requerido',
            'amount.numeric' => 'El monto debe ser un número',
            'amount.min' => 'El monto debe ser mayor a 0',
            'amount.max' => 'El monto no puede exceder 999,999.99',
            'description.required' => 'La descripción es requerida',
            'description.max' => 'La descripción no puede exceder los 500 caracteres',
            'reference.max' => 'La referencia no puede exceder los 100 caracteres',
            'sale_id.exists' => 'La venta seleccionada no existe',
            'movement_date.date' => 'La fecha de movimiento debe ser una fecha válida',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'current_account_id' => 'cuenta corriente',
            'movement_type_id' => 'tipo de movimiento',
            'amount' => 'monto',
            'description' => 'descripción',
            'reference' => 'referencia',
            'sale_id' => 'venta',
            'movement_date' => 'fecha de movimiento',
        ];
    }
}