<?php

namespace App\Http\Requests\Repairs;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRepairRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id' => ['sometimes', 'integer', 'exists:customers,id'],
            'branch_id' => ['sometimes', 'integer', 'exists:branches,id'],
            'device' => ['sometimes', 'string', 'max:255'],
            'serial_number' => ['nullable', 'string', 'max:255'],
            'issue_description' => ['sometimes', 'string', 'max:2000'],
            'diagnosis' => ['nullable', 'string', 'max:2000'],
            'priority' => ['sometimes', Rule::in(['Alta', 'Media', 'Baja'])],
            'status' => [
                'sometimes',
                Rule::in([
                    'Recibido',
                    'En diagnóstico',
                    'En reparación',
                    'Esperando repuestos',
                    'Terminado',
                    'Entregado'
                ])
            ],
            'estimated_date' => ['nullable', 'date'],
            'technician_id' => ['nullable', 'integer', 'exists:users,id'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'sale_price' => ['nullable', 'numeric', 'min:0'],
            'sale_id' => ['nullable', 'integer', 'exists:sales_header,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.exists' => 'El cliente seleccionado no existe.',
            'branch_id.exists' => 'La sucursal seleccionada no existe.',
            'device.max' => 'El nombre del equipo no debe superar los 255 caracteres.',
            'serial_number.max' => 'El número de serie no debe superar los 255 caracteres.',
            'issue_description.max' => 'La descripción del problema no debe superar los 2000 caracteres.',
            'diagnosis.max' => 'El diagnóstico no debe superar los 2000 caracteres.',
            'priority.in' => 'La prioridad debe ser Alta, Media o Baja.',
            'status.in' => 'El estado seleccionado no es válido.',
            'estimated_date.date' => 'La fecha estimada debe ser una fecha válida.',
            'technician_id.exists' => 'El técnico seleccionado no existe.',
            'cost.numeric' => 'El costo debe ser un número.',
            'cost.min' => 'El costo no puede ser negativo.',
            'sale_price.numeric' => 'El precio de venta debe ser un número.',
            'sale_price.min' => 'El precio de venta no puede ser negativo.',
            'sale_id.exists' => 'La venta seleccionada no existe.',
        ];
    }
}
