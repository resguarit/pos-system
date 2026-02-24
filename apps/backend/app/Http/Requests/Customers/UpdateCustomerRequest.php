<?php

namespace App\Http\Requests\Customers;

use App\Models\Customer;
use App\Models\Person;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'last_name' => $this->filled('last_name') && trim((string) $this->input('last_name')) !== ''
                ? trim((string) $this->input('last_name'))
                : null,
            'phone' => $this->filled('phone') && trim((string) $this->input('phone')) !== ''
                ? trim((string) $this->input('phone'))
                : null,
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
        $customerId = $this->route('id') ?? $this->route('customer');
        $customer = $customerId ? Customer::with('person')->find($customerId) : null;
        $personId = $customer?->person?->id;
        $lastName = $this->input('last_name');

        $firstNameUniqueRule = Rule::unique('people', 'first_name')
            ->where(function ($query) use ($lastName) {
                $query->whereNull('deleted_at');
                if ($lastName === null || trim((string) $lastName) === '') {
                    $query->whereNull('last_name');
                } else {
                    $query->where('last_name', $lastName);
                }
            });

        if ($personId) {
            $firstNameUniqueRule = $firstNameUniqueRule->ignore($personId);
        }

        return [
            'first_name' => ['required', 'string', 'max:255', $firstNameUniqueRule],
            'last_name' => ['nullable', 'string', 'max:255'],
            'documento' => [
                'nullable',
                'regex:/^[0-9]+$/',
                'between:7,8',
                function ($attribute, $value, $fail) use ($personId) {
                    if ($value === null || trim((string) $value) === '') {
                        return;
                    }
                    $exists = Person::whereNull('deleted_at')
                        ->when($personId, fn($query) => $query->where('id', '!=', $personId))
                        ->where(function ($query) use ($value) {
                            $query->where('documento', $value)
                                ->orWhere('cuit', $value);
                        })
                        ->exists();

                    if ($exists) {
                        $fail('Ya existe un cliente con este DNI/CUIT.');
                    }
                },
            ],
            'document_type_id' => ['nullable', 'integer', 'exists:document_types,id'],
            'cuit' => [
                'nullable',
                'regex:/^[0-9]+$/',
                'size:11',
                function ($attribute, $value, $fail) use ($personId) {
                    if ($value === null || trim((string) $value) === '') {
                        return;
                    }
                    $exists = Person::whereNull('deleted_at')
                        ->when($personId, fn($query) => $query->where('id', '!=', $personId))
                        ->where(function ($query) use ($value) {
                            $query->where('cuit', $value)
                                ->orWhere('documento', $value);
                        })
                        ->exists();

                    if ($exists) {
                        $fail('Este CUIT ya esta registrado.');
                    }
                },
            ],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'regex:/^[0-9a-zA-Z]+$/', 'max:10'],
            'phone' => [
                'nullable',
                'regex:/^[0-9]+$/',
                'between:6,20',
                Rule::unique('people', 'phone')
                    ->whereNull('deleted_at')
                    ->ignore($personId),
            ],
            'fiscal_condition_id' => ['nullable', 'integer', 'exists:fiscal_conditions,id'],
            'person_type_id' => ['nullable', 'integer', 'exists:person_types,id'],
            'email' => [
                'nullable',
                'email:rfc,dns',
                'max:255',
                Rule::unique('customers', 'email')
                    ->whereNull('deleted_at')
                    ->ignore($customerId),
            ],
            'active' => ['nullable', 'boolean'],
            'credit_limit' => ['nullable', 'numeric', 'min:0', 'max:999999999.99'],
            'notes' => ['nullable', 'string', 'max:2000'],
            // Tax identities array (optional - for multiple CUITs per customer)
            'tax_identities' => ['nullable', 'array'],
            'tax_identities.*.id' => ['nullable', 'integer', 'exists:customer_tax_identities,id'],
            'tax_identities.*.cuit' => ['nullable', 'regex:/^[0-9]+$/', 'size:11'],
            'tax_identities.*.business_name' => ['nullable', 'string', 'max:255'],
            'tax_identities.*.fiscal_condition_id' => ['nullable', 'integer', 'exists:fiscal_conditions,id'],
            'tax_identities.*.is_default' => ['nullable', 'boolean'],
            'tax_identities.*.cbu' => ['nullable', 'regex:/^[0-9]+$/', 'size:22'],
            'tax_identities.*.cbu_alias' => ['nullable', 'string', 'max:50'],
            'tax_identities.*.bank_name' => ['nullable', 'string', 'max:100'],
            'tax_identities.*.account_holder' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            // First Name (required)
            'first_name.required' => 'Debe ingresar el nombre del cliente.',
            'first_name.string' => 'El nombre debe ser texto.',
            'first_name.max' => 'El nombre es demasiado largo. Máximo permitido: 255 caracteres.',
            'first_name.unique' => 'Ya existe un cliente con este nombre y apellido.',

            // Last Name
            'last_name.string' => 'El apellido debe ser texto.',
            'last_name.max' => 'El apellido es demasiado largo. Máximo permitido: 255 caracteres.',

            // Document Number
            'documento.regex' => 'El número de documento debe contener solo números (sin puntos, guiones ni letras).',
            'documento.between' => 'El DNI debe tener 7 u 8 dígitos.',
            'documento.unique' => 'Ya existe un cliente con este DNI.',

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
            'phone.unique' => 'Este teléfono ya está registrado.',

            // Fiscal Condition
            'fiscal_condition_id.integer' => 'La condición fiscal seleccionada no es válida.',
            'fiscal_condition_id.exists' => 'La condición fiscal seleccionada no existe en el sistema.',

            // Person Type
            'person_type_id.integer' => 'El tipo de persona seleccionado no es válido.',
            'person_type_id.exists' => 'El tipo de persona seleccionado no existe en el sistema.',

            // Email
            'email.email' => 'El correo electrónico no tiene un formato válido. Ejemplo: nombre@ejemplo.com',
            'email.max' => 'El correo electrónico es demasiado largo. Máximo permitido: 255 caracteres.',
            'email.unique' => 'Este correo electrónico ya está registrado.',

            // Active
            'active.boolean' => 'El estado activo debe ser verdadero o falso.',

            // Credit Limit
            'credit_limit.numeric' => 'El límite de crédito debe ser un número.',
            'credit_limit.min' => 'El límite de crédito no puede ser negativo.',

            // Notes
            'notes.string' => 'Las notas deben ser texto.',
            'notes.max' => 'Las notas son demasiado largas. Máximo permitido: 2000 caracteres.',

            // Tax Identities
            'tax_identities.array' => 'Las identidades fiscales deben ser una lista.',
            'tax_identities.*.cuit.regex' => 'El CUIT debe contener solo números (sin guiones). Ejemplo: 20123456789',
            'tax_identities.*.cuit.size' => 'El CUIT debe tener exactamente 11 dígitos.',
            'tax_identities.*.business_name.string' => 'La razón social debe ser texto.',
            'tax_identities.*.business_name.max' => 'La razón social es demasiado larga. Máximo permitido: 255 caracteres.',
            'tax_identities.*.fiscal_condition_id.integer' => 'La condición fiscal seleccionada no es válida.',
            'tax_identities.*.fiscal_condition_id.exists' => 'La condición fiscal seleccionada no existe en el sistema.',
            'tax_identities.*.is_default.boolean' => 'El campo predeterminado debe ser verdadero o falso.',
            'tax_identities.*.cbu.regex' => 'El CBU/CVU debe contener solo números.',
            'tax_identities.*.cbu.size' => 'El CBU/CVU debe tener exactamente 22 dígitos.',
            'tax_identities.*.cbu_alias.string' => 'El alias de CBU debe ser texto.',
            'tax_identities.*.cbu_alias.max' => 'El alias de CBU es demasiado largo. Máximo: 50 caracteres.',
            'tax_identities.*.bank_name.string' => 'El nombre del banco debe ser texto.',
            'tax_identities.*.bank_name.max' => 'El nombre del banco es demasiado largo. Máximo: 100 caracteres.',
            'tax_identities.*.account_holder.string' => 'El titular de la cuenta debe ser texto.',
            'tax_identities.*.account_holder.max' => 'El titular de la cuenta es demasiado largo. Máximo: 255 caracteres.',
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
