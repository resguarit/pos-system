<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStockTransferRequest extends FormRequest
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
            'source_branch_id' => [
                'sometimes',
                'integer',
                'exists:branches,id',
                'different:destination_branch_id',
            ],
            'destination_branch_id' => [
                'sometimes',
                'integer',
                'exists:branches,id',
            ],
            'transfer_date' => [
                'sometimes',
                'date',
            ],
            'notes' => [
                'nullable',
                'string',
                'max:1000',
            ],
            'items' => [
                'sometimes',
                'array',
                'min:1',
            ],
            'items.*.product_id' => [
                'required_with:items',
                'integer',
                'exists:products,id',
            ],
            'items.*.quantity' => [
                'required_with:items',
                'integer',
                'min:1',
            ],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'source_branch_id.exists' => 'La sucursal de origen no existe',
            'source_branch_id.different' => 'Las sucursales de origen y destino deben ser diferentes',
            'destination_branch_id.exists' => 'La sucursal de destino no existe',
            'transfer_date.date' => 'La fecha de transferencia debe ser una fecha válida',
            'transfer_date.before_or_equal' => 'La fecha de transferencia no puede ser futura',
            'notes.max' => 'Las notas no pueden exceder 1000 caracteres',
            'items.min' => 'Debe agregar al menos un producto',
            'items.*.product_id.required_with' => 'El producto es obligatorio',
            'items.*.product_id.exists' => 'El producto no existe',
            'items.*.quantity.required_with' => 'La cantidad es obligatoria',
            'items.*.quantity.min' => 'La cantidad debe ser mayor a 0',
        ];
    }
}
