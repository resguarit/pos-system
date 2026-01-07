<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStockTransferRequest extends FormRequest
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
                'required',
                'integer',
                'exists:branches,id',
                'different:destination_branch_id',
            ],
            'destination_branch_id' => [
                'required',
                'integer',
                'exists:branches,id',
            ],
            'transfer_date' => [
                'required',
                'date',
            ],
            'notes' => [
                'nullable',
                'string',
                'max:1000',
            ],
            'items' => [
                'required',
                'array',
                'min:1',
            ],
            'items.*.product_id' => [
                'required',
                'integer',
                'exists:products,id',
            ],
            'items.*.quantity' => [
                'required',
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
            'source_branch_id.required' => 'La sucursal de origen es obligatoria',
            'source_branch_id.exists' => 'La sucursal de origen no existe',
            'source_branch_id.different' => 'Las sucursales de origen y destino deben ser diferentes',
            'destination_branch_id.required' => 'La sucursal de destino es obligatoria',
            'destination_branch_id.exists' => 'La sucursal de destino no existe',
            'transfer_date.required' => 'La fecha de transferencia es obligatoria',
            'transfer_date.date' => 'La fecha de transferencia debe ser una fecha válida',
            'transfer_date.before_or_equal' => 'La fecha de transferencia no puede ser futura',
            'notes.max' => 'Las notas no pueden exceder 1000 caracteres',
            'items.required' => 'Debe agregar al menos un producto',
            'items.min' => 'Debe agregar al menos un producto',
            'items.*.product_id.required' => 'El producto es obligatorio',
            'items.*.product_id.exists' => 'El producto no existe',
            'items.*.quantity.required' => 'La cantidad es obligatoria',
            'items.*.quantity.min' => 'La cantidad debe ser mayor a 0',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'source_branch_id' => 'sucursal de origen',
            'destination_branch_id' => 'sucursal de destino',
            'transfer_date' => 'fecha de transferencia',
            'items' => 'productos',
            'items.*.product_id' => 'producto',
            'items.*.quantity' => 'cantidad',
        ];
    }
}
