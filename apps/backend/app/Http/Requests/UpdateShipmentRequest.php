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
            'shipping_address' => 'sometimes|string|max:255',
            'shipping_city' => 'sometimes|string|max:255',
            'shipping_state' => 'nullable|string|max:255',
            'shipping_postal_code' => 'nullable|string|max:20',
            'shipping_country' => 'nullable|string|max:255',
            'priority' => 'nullable|string|in:low,normal,high,urgent',
            'estimated_delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'current_stage_id' => 'sometimes|integer|exists:shipment_stages,id',
            'shipping_cost' => 'sometimes|numeric|min:0',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'version.required' => 'Version is required for optimistic locking.',
        ];
    }
}
