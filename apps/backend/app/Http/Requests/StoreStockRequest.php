<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // O ajusta según tu lógica de autorización
    }

    public function rules(): array
    {
        return [
            'product_id' => 'required|integer|exists:products,id',
            'branch_id' => 'required|integer|exists:branches,id',
            // supplier_id ya no es requerido al crear/ajustar stock directamente
            // 'supplier_id' => 'required|integer|exists:suppliers,id',
            // Valida el stock inicial que se está creando
            'current_stock' => 'required|integer',
            'min_stock' => 'required|integer|min:0',
            // max_stock debe ser entero, mayor que 0 y mayor que min_stock
            'max_stock' => 'required|integer|min:1|gt:min_stock',
        ];
    }

    public function messages(): array
    {
        return [
            'max_stock.gt' => 'El stock máximo debe ser mayor que el stock mínimo.',
            'max_stock.min' => 'El stock máximo debe ser mayor que 0.',
            // Puedes añadir más mensajes personalizados aquí
        ];
    }
}
