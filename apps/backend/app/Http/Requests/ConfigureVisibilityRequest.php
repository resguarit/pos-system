<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConfigureVisibilityRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->hasPermission('shipment.attribute.configure');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'stage_id' => 'required|integer|exists:shipment_stages,id',
            'role_id' => 'required|integer|exists:roles,id',
            'rules' => 'required|array',
            'rules.*' => 'boolean',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'stage_id.required' => 'Stage ID is required.',
            'role_id.required' => 'Role ID is required.',
            'rules.required' => 'Visibility rules are required.',
            'rules.array' => 'Visibility rules must be an array.',
        ];
    }
}
