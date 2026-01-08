<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateShipmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->hasPermission('editar_envios') || $this->user()->hasPermission('ver_envios');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'metadata' => 'sometimes|array',
            'version' => 'required|integer',
            'shipping_address' => 'sometimes|nullable|string|max:255',
            'shipping_city' => 'sometimes|nullable|string|max:255',
            'shipping_state' => 'nullable|string|max:255',
            'shipping_postal_code' => 'nullable|string|max:20',
            'shipping_country' => 'nullable|string|max:255',
            'priority' => 'nullable|string|in:low,normal,high,urgent',
            'estimated_delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'current_stage_id' => 'sometimes|integer|exists:shipment_stages,id',
            'shipping_cost' => 'sometimes|numeric|min:0',
            'sale_ids' => 'sometimes|array',
            'sale_ids.*' => 'integer|exists:sales_header,id',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'version.required' => 'La versión es obligatoria para el control de concurrencia.',
            'version.integer' => 'La versión debe ser un número entero.',
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
            'current_stage_id.integer' => 'El ID de la etapa debe ser un número entero.',
            'current_stage_id.exists' => 'La etapa seleccionada no existe.',
            'shipping_cost.numeric' => 'El costo de envío debe ser un número.',
            'shipping_cost.min' => 'El costo de envío no puede ser negativo.',
        ];
    }
}
