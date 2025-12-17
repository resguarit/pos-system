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
            'sale_ids.required' => 'At least one sale must be selected.',
            'sale_ids.min' => 'At least one sale must be selected.',
            'sale_ids.*.exists' => 'One or more selected sales do not exist.',
        ];
    }
}