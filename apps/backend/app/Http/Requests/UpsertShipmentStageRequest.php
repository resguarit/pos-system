<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpsertShipmentStageRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->hasPermission('shipment.stage.create') || 
               $this->user()->hasPermission('shipment.stage.update');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'id' => 'sometimes|integer|exists:shipment_stages,id',
            'name' => 'required|string|max:255',
            'description' => 'sometimes|string|max:1000',
            'order' => 'sometimes|integer|min:0',
            'config' => 'sometimes|array',
            'active' => 'sometimes|boolean',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Stage name is required.',
            'name.max' => 'Stage name cannot exceed 255 characters.',
            'order.min' => 'Order must be a positive number.',
        ];
    }
}
