<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MoveShipmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->hasPermission('shipment.move');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'stage_id' => 'required|integer|exists:shipment_stages,id',
            'metadata' => 'sometimes|array',
            'version' => 'required|integer',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'stage_id.required' => 'Target stage is required.',
            'stage_id.exists' => 'Selected stage does not exist.',
            'version.required' => 'Version is required for optimistic locking.',
        ];
    }
}