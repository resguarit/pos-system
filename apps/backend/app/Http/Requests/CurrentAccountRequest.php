<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CurrentAccountRequest extends FormRequest
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
     */
    public function rules(): array
    {
        $rules = [];
        
        switch ($this->method()) {
            case 'POST':
                $rules = [
                    'customer_id' => 'required|integer|exists:customers,id',
                    'credit_limit' => 'nullable|numeric|min:0|max:999999.99',
                    'notes' => 'nullable|string|max:1000',
                ];
                break;
                
            case 'PUT':
            case 'PATCH':
                $rules = [
                    'customer_id' => 'sometimes|integer|exists:customers,id',
                    'credit_limit' => 'nullable|numeric|min:0|max:999999.99',
                    'notes' => 'nullable|string|max:1000',
                ];
                break;
        }
        
        return $rules;
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'customer_id.required' => 'El cliente es requerido',
            'customer_id.exists' => 'El cliente seleccionado no existe',
            'credit_limit.numeric' => 'El límite de crédito debe ser un número',
            'credit_limit.min' => 'El límite de crédito no puede ser negativo',
            'credit_limit.max' => 'El límite de crédito no puede exceder 999,999.99',
            'notes.max' => 'Las notas no pueden exceder los 1000 caracteres',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'customer_id' => 'cliente',
            'credit_limit' => 'límite de crédito',
            'notes' => 'notas',
        ];
    }
}