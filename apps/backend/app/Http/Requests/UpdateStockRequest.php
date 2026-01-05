<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Stock; // Asegúrate de importar tu modelo Stock

class UpdateStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // O ajusta según tu lógica de autorización
    }

    public function rules(): array
    {
        // Obtén el valor de min_stock que se está enviando o el existente
        // Necesitas asegurarte de que la ruta tenga el binding {stock}
        $stockModel = $this->route('stock'); // Obtiene el modelo Stock de la ruta
        $minStockValue = $this->input('min_stock', $stockModel?->min_stock); // Usa el min_stock del request o el existente

        return [
            // 'sometimes' permite que los campos sean opcionales en la actualización
            'product_id' => 'sometimes|required|integer|exists:products,id',
            'branch_id' => 'sometimes|required|integer|exists:branches,id',
            // supplier_id ya no es requerido en update de stock directo
            // 'supplier_id' => 'sometimes|required|integer|exists:suppliers,id',
            // Valida el nuevo stock total que se está estableciendo
            'current_stock' => 'sometimes|required|integer|min:-2147483648|max:2147483647',
            'min_stock' => 'sometimes|required|integer|min:0',
            // Valida max_stock contra el min_stock (nuevo o existente)
            'max_stock' => [
                'sometimes',
                'required',
                'integer',
                'min:1', // Debe ser mayor que 0
                // Función personalizada para comparar con min_stock
                function ($attribute, $value, $fail) use ($minStockValue) {
                    // Asegúrate de que minStockValue no sea null antes de comparar
                    if ($minStockValue !== null && $value <= $minStockValue) {
                        $fail('El stock máximo debe ser mayor que el stock mínimo.');
                    }
                },
            ],
        ];
    }

    public function messages(): array
    {
        return [
            // Mensajes personalizados si es necesario, la función personalizada ya tiene uno.
            'max_stock.min' => 'El stock máximo debe ser mayor que 0.',
        ];
    }
}
