<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateShipmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->hasPermission('crear_envios') || $this->user()->hasPermission('ver_envios');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'sale_ids' => 'required|array|min:1',
            'sale_ids.*' => 'required|integer|exists:sales_header,id',
            'shipping_address' => 'required|string|max:255',
            'shipping_city' => 'nullable|string|max:255',
            'shipping_state' => 'nullable|string|max:255',
            'shipping_postal_code' => 'nullable|string|max:20',
            'shipping_country' => 'nullable|string|max:255',
            'priority' => 'nullable|string|in:low,normal,high,urgent',
            'estimated_delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'shipping_cost' => 'nullable|numeric|min:0',
            'branch_id' => 'nullable|integer|exists:branches,id',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'sale_ids.required' => 'Debe seleccionar al menos una venta.',
            'sale_ids.array' => 'El formato de ventas seleccionadas es inválido.',
            'sale_ids.min' => 'Debe seleccionar al menos una venta.',
            'sale_ids.*.required' => 'El ID de la venta es obligatorio.',
            'sale_ids.*.integer' => 'El ID de la venta debe ser un número entero.',
            'sale_ids.*.exists' => 'Una o más ventas seleccionadas no existen.',
            'shipping_address.required' => 'El campo dirección es obligatorio.',
            'shipping_address.string' => 'La dirección debe ser texto.',
            'shipping_address.max' => 'La dirección no puede tener más de 255 caracteres.',
            'shipping_city.string' => 'La ciudad debe ser texto.',
            'shipping_city.max' => 'La ciudad no puede tener más de 255 caracteres.',
            'shipping_state.string' => 'La provincia/estado debe ser texto.',
            'shipping_state.max' => 'La provincia/estado no puede tener más de 255 caracteres.',
            'shipping_postal_code.string' => 'El código postal debe ser texto.',
            'shipping_postal_code.max' => 'El código postal no puede tener más de 20 caracteres.',
            'shipping_country.string' => 'El país debe ser texto.',
            'shipping_country.max' => 'El país no puede tener más de 255 caracteres.',
            'priority.string' => 'La prioridad debe ser texto.',
            'priority.in' => 'La prioridad seleccionada no es válida.',
            'estimated_delivery_date.date' => 'La fecha estimada de entrega no es válida.',
            'notes.string' => 'Las notas deben ser texto.',
            'shipping_cost.numeric' => 'El costo de envío debe ser un número.',
            'shipping_cost.min' => 'El costo de envío no puede ser negativo.',
            'branch_id.integer' => 'El ID de la sucursal debe ser un número entero.',
            'branch_id.exists' => 'La sucursal seleccionada no existe.',
        ];
    }
}