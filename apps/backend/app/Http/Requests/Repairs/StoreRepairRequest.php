<?php

namespace App\Http\Requests\Repairs;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRepairRequest extends FormRequest
{
    /**
     * Valid repair statuses - centralized for consistency
     */
    public const VALID_STATUSES = [
        'Recibido',
        'En diagnóstico',
        'Reparación Interna',
        'Reparación Externa',
        'Esperando repuestos',
        'Terminado',
        'Entregado',
    ];

    /**
     * Valid priority levels
     */
    public const VALID_PRIORITIES = ['Alta', 'Media', 'Baja'];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'device' => ['required', 'string', 'max:255'],
            'serial_number' => ['nullable', 'string', 'max:255'],
            'issue_description' => ['required', 'string', 'max:2000'],
            'diagnosis' => ['nullable', 'string', 'max:2000'],
            'priority' => ['required', Rule::in(self::VALID_PRIORITIES)],
            'status' => ['nullable', Rule::in(self::VALID_STATUSES)],
            'estimated_date' => ['nullable', 'date'],
            'intake_date' => ['nullable', 'date'],
            'technician_id' => ['nullable', 'integer', 'exists:users,id'],
            'initial_notes' => ['nullable', 'string', 'max:2000'],
            'cost' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'sale_price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            // Siniestro fields
            'is_siniestro' => ['nullable', 'boolean'],
            'insurer_id' => ['nullable', 'required_if:is_siniestro,true', 'integer', 'exists:insurers,id'],
            'siniestro_number' => ['nullable', 'string', 'max:100'],
            'insured_customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'policy_number' => ['nullable', 'string', 'max:100'],
            'device_age' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        $statusList = implode(', ', self::VALID_STATUSES);
        $priorityList = implode(', ', self::VALID_PRIORITIES);

        return [
            // Customer (required)
            'customer_id.required' => 'Debe seleccionar un cliente para la reparación.',
            'customer_id.integer' => 'El ID del cliente debe ser un número válido.',
            'customer_id.exists' => 'El cliente seleccionado no existe en el sistema. Por favor, seleccione un cliente válido o cree uno nuevo.',

            // Branch (required)
            'branch_id.required' => 'Debe seleccionar una sucursal.',
            'branch_id.integer' => 'El ID de la sucursal debe ser un número válido.',
            'branch_id.exists' => 'La sucursal seleccionada no existe en el sistema.',

            // Category
            'category_id.integer' => 'El ID de la categoría debe ser un número válido.',
            'category_id.exists' => 'La categoría seleccionada no existe. Verifique que la categoría esté activa.',

            // Device (required)
            'device.required' => 'Debe ingresar el nombre o modelo del equipo.',
            'device.string' => 'El nombre del equipo debe ser texto.',
            'device.max' => 'El nombre del equipo es demasiado largo. Máximo permitido: 255 caracteres.',

            // Serial Number
            'serial_number.string' => 'El número de serie debe ser texto.',
            'serial_number.max' => 'El número de serie es demasiado largo. Máximo permitido: 255 caracteres.',

            // Issue Description (required)
            'issue_description.required' => 'Debe describir el problema o inconveniente del equipo.',
            'issue_description.string' => 'La descripción del problema debe ser texto.',
            'issue_description.max' => 'La descripción del problema es demasiado larga. Máximo permitido: 2000 caracteres.',

            // Diagnosis
            'diagnosis.string' => 'El diagnóstico debe ser texto.',
            'diagnosis.max' => 'El diagnóstico es demasiado largo. Máximo permitido: 2000 caracteres.',

            // Priority (required)
            'priority.required' => 'Debe seleccionar una prioridad para la reparación.',
            'priority.in' => "Prioridad no válida. Los valores permitidos son: {$priorityList}.",

            // Status
            'status.in' => "Estado no válido. Los estados permitidos son: {$statusList}.",

            // Estimated Date
            'estimated_date.date' => 'La fecha estimada no tiene un formato válido. Use el formato DD/MM/AAAA.',

            // Technician
            'technician_id.integer' => 'El ID del técnico debe ser un número válido.',
            'technician_id.exists' => 'El técnico seleccionado no existe en el sistema.',

            // Initial Notes
            'initial_notes.string' => 'Las observaciones iniciales deben ser texto.',
            'initial_notes.max' => 'Las observaciones son demasiado largas. Máximo permitido: 2000 caracteres.',

            // Cost
            'cost.numeric' => 'El costo debe ser un valor numérico (ej: 1500.50).',
            'cost.min' => 'El costo no puede ser negativo.',
            'cost.max' => 'El costo excede el máximo permitido.',

            // Sale Price
            'sale_price.numeric' => 'El precio de venta debe ser un valor numérico (ej: 2000.00).',
            'sale_price.min' => 'El precio de venta no puede ser negativo.',
            'sale_price.max' => 'El precio de venta excede el máximo permitido.',

            // Siniestro fields
            'is_siniestro.boolean' => 'El campo siniestro debe ser verdadero o falso.',
            'insurer_id.required_if' => 'Debe seleccionar una aseguradora cuando es un siniestro.',
            'insurer_id.integer' => 'El ID de la aseguradora debe ser un número válido.',
            'insurer_id.exists' => 'La aseguradora seleccionada no existe en el sistema.',
            'siniestro_number.string' => 'El número de siniestro debe ser texto.',
            'siniestro_number.max' => 'El número de siniestro es demasiado largo. Máximo permitido: 100 caracteres.',
            'insured_customer_id.integer' => 'El ID del cliente asegurado debe ser un número válido.',
            'insured_customer_id.exists' => 'El cliente asegurado seleccionado no existe en el sistema.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'customer_id' => 'cliente',
            'branch_id' => 'sucursal',
            'category_id' => 'categoría',
            'device' => 'equipo',
            'serial_number' => 'número de serie',
            'issue_description' => 'descripción del problema',
            'diagnosis' => 'diagnóstico',
            'priority' => 'prioridad',
            'status' => 'estado',
            'estimated_date' => 'fecha estimada',
            'intake_date' => 'fecha de recibido',
            'technician_id' => 'técnico',
            'initial_notes' => 'observaciones iniciales',
            'cost' => 'costo',
            'sale_price' => 'precio de venta',
            'is_siniestro' => 'es siniestro',
            'insurer_id' => 'aseguradora',
            'siniestro_number' => 'número de siniestro',
            'insured_customer_id' => 'cliente asegurado',
        ];
    }
}
