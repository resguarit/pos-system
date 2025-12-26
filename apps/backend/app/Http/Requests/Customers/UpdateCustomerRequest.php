<?php

namespace App\Http\Requests\Customers;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare data for validation - normalize empty strings to null
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => $this->filled('email') && trim($this->input('email')) !== ''
                ? trim($this->input('email'))
                : null,
            'credit_limit' => $this->filled('credit_limit') && trim((string) $this->input('credit_limit')) !== ''
                ? $this->input('credit_limit')
                : null,
            // Don't manipulate documento - let validation reject invalid format
            'documento' => $this->filled('documento') && trim((string) $this->input('documento')) !== ''
                ? trim((string) $this->input('documento'))
                : null,
        ]);
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'documento' => ['nullable', 'regex:/^[0-9]+$/', 'between:6,12'],
            'document_type_id' => ['nullable', 'integer', 'exists:document_types,id'],
            'cuit' => ['nullable', 'regex:/^[0-9]+$/', 'size:11'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'regex:/^[0-9a-zA-Z]+$/', 'max:10'],
            'phone' => ['nullable', 'regex:/^[0-9]+$/', 'between:6,20'],
            'fiscal_condition_id' => ['nullable', 'integer', 'exists:fiscal_conditions,id'],
            'person_type_id' => ['nullable', 'integer', 'exists:person_types,id'],
            'email' => ['nullable', 'email:rfc,dns', 'max:255'],
            'active' => ['nullable', 'boolean'],
            'credit_limit' => ['nullable', 'numeric', 'min:0', 'max:999999999.99'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            // First Name (required)
            'first_name.required' => 'Debe ingresar el nombre del cliente.',
            'first_name.string' => 'El nombre debe ser texto.',
            'first_name.max' => 'El nombre es demasiado largo. Máximo permitido: 255 caracteres.',

            // Last Name
            'last_name.string' => 'El apellido debe ser texto.',
            'last_name.max' => 'El apellido es demasiado largo. Máximo permitido: 255 caracteres.',

            // Document Number
            'documento.regex' => 'El número de documento debe contener solo números (sin puntos, guiones ni letras).',
            'documento.between' => 'El número de documento debe tener entre 6 y 12 dígitos.',

            // Document Type
            'document_type_id.integer' => 'El tipo de documento seleccionado no es válido.',
            'document_type_id.exists' => 'El tipo de documento seleccionado no existe en el sistema.',

            // CUIT
            'cuit.regex' => 'El CUIT debe contener solo números (sin guiones). Ejemplo: 20123456789',
            'cuit.size' => 'El CUIT debe tener exactamente 11 dígitos.',

            // Address
            'address.string' => 'La dirección debe ser texto.',
            'address.max' => 'La dirección es demasiado larga. Máximo permitido: 255 caracteres.',

            // City
            'city.string' => 'La ciudad debe ser texto.',
            'city.max' => 'El nombre de la ciudad es demasiado largo. Máximo permitido: 255 caracteres.',

            // State
            'state.string' => 'La provincia debe ser texto.',
            'state.max' => 'El nombre de la provincia es demasiado largo. Máximo permitido: 255 caracteres.',

            // Postal Code
            'postal_code.regex' => 'El código postal debe contener solo letras y números.',
            'postal_code.max' => 'El código postal es demasiado largo. Máximo permitido: 10 caracteres.',

            // Phone
            'phone.regex' => 'El teléfono debe contener solo números (sin espacios, guiones ni paréntesis). Ejemplo: 1123456789',
            'phone.between' => 'El teléfono debe tener entre 6 y 20 dígitos.',

            // Fiscal Condition
            'fiscal_condition_id.integer' => 'La condición fiscal seleccionada no es válida.',
            'fiscal_condition_id.exists' => 'La condición fiscal seleccionada no existe en el sistema.',

            // Person Type
            'person_type_id.integer' => 'El tipo de persona seleccionado no es válido.',
            'person_type_id.exists' => 'El tipo de persona seleccionado no existe en el sistema.',

            // Email
            'email.email' => 'El correo electrónico no tiene un formato válido. Ejemplo: nombre@ejemplo.com',
            'email.max' => 'El correo electrónico es demasiado largo. Máximo permitido: 255 caracteres.',

            // Active
            'active.boolean' => 'El estado activo debe ser verdadero o falso.',

            // Credit Limit
            'credit_limit.numeric' => 'El límite de crédito debe ser un número.',
            'credit_limit.min' => 'El límite de crédito no puede ser negativo.',

            // Notes
            'notes.string' => 'Las notas deben ser texto.',
            'notes.max' => 'Las notas son demasiado largas. Máximo permitido: 2000 caracteres.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'first_name' => 'nombre',
            'last_name' => 'apellido',
            'documento' => 'número de documento',
            'document_type_id' => 'tipo de documento',
            'cuit' => 'CUIT',
            'address' => 'dirección',
            'city' => 'ciudad',
            'state' => 'provincia',
            'postal_code' => 'código postal',
            'phone' => 'teléfono',
            'fiscal_condition_id' => 'condición fiscal',
            'person_type_id' => 'tipo de persona',
            'email' => 'correo electrónico',
            'active' => 'estado activo',
            'credit_limit' => 'límite de crédito',
            'notes' => 'notas',
        ];
    }
}
