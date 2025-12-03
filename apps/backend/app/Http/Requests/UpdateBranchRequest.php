<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBranchRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = auth()->user();
        return $user && $user->role
            ->permissions()
            ->where('name', 'editar_sucursales')
            ->exists();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'description' => ['sometimes', 'string', 'max:255'],
            'address' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'point_of_sale' => ['nullable', 'string', 'max:255'],
            'manager_id' => ['nullable', 'exists:users,id'],
            'status' => ['sometimes', 'boolean'],
            'color' => ['sometimes', 'string', 'max:7', 'regex:/^#[0-9A-F]{6}$/i'],
            
            // Campos fiscales para AFIP
            'cuit' => [
                'nullable',
                'string',
                'regex:/^[0-9]{11}$/',
                function ($attribute, $value, $fail) {
                    if ($value && !$this->validateCuit($value)) {
                        $fail('El CUIT ingresado no es válido. Debe tener 11 dígitos y un dígito verificador correcto.');
                    }
                },
            ],
            'razon_social' => ['nullable', 'string', 'max:255'],
            'iibb' => ['nullable', 'string', 'max:50'],
            'start_date' => ['nullable', 'date'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'description.max' => 'El nombre de la sucursal no puede exceder 255 caracteres.',
            'address.max' => 'La dirección no puede exceder 255 caracteres.',
            'email.email' => 'El email debe tener un formato válido.',
            'email.max' => 'El email no puede exceder 255 caracteres.',
            'phone.max' => 'El teléfono no puede exceder 20 caracteres.',
            'point_of_sale.max' => 'El punto de venta no puede exceder 255 caracteres.',
            'manager_id.exists' => 'El gerente seleccionado no existe.',
            'color.regex' => 'El color debe estar en formato hexadecimal (ej: #0ea5e9).',
            'cuit.regex' => 'El CUIT debe tener exactamente 11 dígitos numéricos (sin guiones).',
            'razon_social.max' => 'La razón social no puede exceder 255 caracteres.',
            'iibb.max' => 'El número de IIBB no puede exceder 50 caracteres.',
            'start_date.date' => 'La fecha de inicio debe ser una fecha válida.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Limpiar CUIT (quitar guiones y espacios)
        if ($this->has('cuit') && $this->cuit) {
            $this->merge([
                'cuit' => preg_replace('/[^0-9]/', '', $this->cuit),
            ]);
        }
    }

    /**
     * Validar CUIT usando algoritmo de dígito verificador
     * 
     * @param string $cuit CUIT sin guiones (11 dígitos)
     * @return bool
     */
    private function validateCuit(string $cuit): bool
    {
        if (strlen($cuit) !== 11) {
            return false;
        }

        // Algoritmo de validación de CUIT argentino
        $multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
        $sum = 0;

        for ($i = 0; $i < 10; $i++) {
            $sum += (int)$cuit[$i] * $multipliers[$i];
        }

        $remainder = $sum % 11;
        $checkDigit = $remainder < 2 ? $remainder : 11 - $remainder;

        return (int)$cuit[10] === $checkDigit;
    }
}
