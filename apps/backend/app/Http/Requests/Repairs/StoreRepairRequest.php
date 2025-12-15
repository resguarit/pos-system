<?php

namespace App\Http\Requests\Repairs;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRepairRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'device' => ['required', 'string', 'max:255'],
            'serial_number' => ['nullable', 'string', 'max:255'],
            'issue_description' => ['required', 'string', 'max:2000'],
            'diagnosis' => ['nullable', 'string', 'max:2000'],
            'priority' => ['required', Rule::in(['Alta', 'Media', 'Baja'])],
            'status' => [
                'nullable',
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
            'initial_notes' => ['nullable', 'string', 'max:2000'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'sale_price' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.required' => 'El cliente es obligatorio.',
            'customer_id.exists' => 'El cliente seleccionado no existe.',
            'branch_id.required' => 'La sucursal es obligatoria.',
            'branch_id.exists' => 'La sucursal seleccionada no existe.',
            'device.required' => 'El equipo es obligatorio.',
            'device.max' => 'El nombre del equipo no debe superar los 255 caracteres.',
            'serial_number.max' => 'El número de serie no debe superar los 255 caracteres.',
            'issue_description.required' => 'La descripción del problema es obligatoria.',
            'issue_description.max' => 'La descripción del problema no debe superar los 2000 caracteres.',
            'diagnosis.max' => 'El diagnóstico no debe superar los 2000 caracteres.',
            'priority.required' => 'La prioridad es obligatoria.',
            'priority.in' => 'La prioridad debe ser Alta, Media o Baja.',
            'status.in' => 'El estado seleccionado no es válido.',
            'estimated_date.date' => 'La fecha estimada debe ser una fecha válida.',
            'technician_id.exists' => 'El técnico seleccionado no existe.',
            'initial_notes.max' => 'Las notas iniciales no deben superar los 2000 caracteres.',
            'cost.numeric' => 'El costo debe ser un número.',
            'cost.min' => 'El costo no puede ser negativo.',
            'sale_price.numeric' => 'El precio de venta debe ser un número.',
            'sale_price.min' => 'El precio de venta no puede ser negativo.',
        ];
    }
}
