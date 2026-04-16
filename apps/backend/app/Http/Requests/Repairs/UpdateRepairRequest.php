<?php

namespace App\Http\Requests\Repairs;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use App\Models\Category;

class UpdateRepairRequest extends FormRequest
{
    public const FIXED_IVA_PERCENTAGE = 21.0;

    /**
     * Valid repair statuses - centralized for consistency
     */
    public const VALID_STATUSES = [
        'Pendiente de recepción',
        'Recibido',
        'En diagnóstico',
        'Reparación Interna',
        'Reparación Externa',
        'Esperando repuestos',
        'Terminado',
        'Entregado',
        'Cancelado',
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
            'customer_id' => ['sometimes', 'integer', 'exists:customers,id'],
            'branch_id' => ['sometimes', 'integer', 'exists:branches,id'],
            'category_id' => [
                'nullable',
                'integer',
                Rule::exists('categories', 'id')->where('category_type', Category::TYPE_EQUIPMENT),
            ],
            'device' => ['sometimes', 'string', 'max:255'],
            'serial_number' => ['nullable', 'string', 'max:255'],
            'issue_description' => ['sometimes', 'string', 'max:2000'],
            'initial_notes' => ['nullable', 'string', 'max:2000'],
            'diagnosis' => ['nullable', 'string', 'max:2000'],
            'priority' => ['sometimes', Rule::in(self::VALID_PRIORITIES)],
            'status' => ['sometimes', Rule::in(self::VALID_STATUSES)],
            'estimated_date' => ['nullable', 'date', 'after_or_equal:today'],
            'intake_date' => ['nullable', 'date'],
            'technician_id' => ['nullable', 'integer', 'exists:users,id'],
            'cost' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'sale_price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'sale_price_without_iva' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'iva_percentage' => ['nullable', 'numeric'],
            'sale_price_with_iva' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'charge_with_iva' => ['nullable', 'boolean'],
            'sale_id' => ['nullable', 'integer', 'exists:sales_header,id'],
            // Siniestro fields
            'is_siniestro' => ['nullable', 'boolean'],
            'insurer_id' => ['nullable', 'required_if:is_siniestro,true', 'integer', 'exists:insurers,id'],
            'siniestro_number' => ['nullable', 'string', 'max:100'],
            'insured_customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'policy_number' => ['nullable', 'string', 'max:100'],
            'device_age' => ['nullable', 'integer', 'min:0'],
            // No repair fields
            'is_no_repair' => ['nullable', 'boolean'],
            'no_repair_reason' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        $statusList = implode(', ', self::VALID_STATUSES);
        $priorityList = implode(', ', self::VALID_PRIORITIES);

        return [
            // Customer
            'customer_id.integer' => 'El ID del cliente debe ser un número válido.',
            'customer_id.exists' => 'El cliente seleccionado no existe en el sistema. Por favor, seleccione un cliente válido.',

            // Branch
            'branch_id.integer' => 'El ID de la sucursal debe ser un número válido.',
            'branch_id.exists' => 'La sucursal seleccionada no existe en el sistema.',

            // Category
            'category_id.integer' => 'El ID de la categoría debe ser un número válido.',
            'category_id.exists' => 'La categoría seleccionada no existe. Verifique que la categoría esté activa.',

            // Device
            'device.string' => 'El nombre del equipo debe ser texto.',
            'device.max' => 'El nombre del equipo es demasiado largo. Máximo permitido: 255 caracteres.',

            // Serial Number
            'serial_number.string' => 'El número de serie debe ser texto.',
            'serial_number.max' => 'El número de serie es demasiado largo. Máximo permitido: 255 caracteres.',

            // Issue Description
            'issue_description.string' => 'La descripción del problema debe ser texto.',
            'issue_description.max' => 'La descripción del problema es demasiado larga. Máximo permitido: 2000 caracteres.',

            // Initial Notes
            'initial_notes.string' => 'Los accesorios/observaciones iniciales deben ser texto.',
            'initial_notes.max' => 'Los accesorios/observaciones iniciales son demasiado largos. Máximo permitido: 2000 caracteres.',

            // Diagnosis
            'diagnosis.string' => 'El diagnóstico debe ser texto.',
            'diagnosis.max' => 'El diagnóstico es demasiado largo. Máximo permitido: 2000 caracteres.',

            // Priority
            'priority.in' => "Prioridad no válida. Los valores permitidos son: {$priorityList}.",

            // Status
            'status.in' => "Estado no válido. Los estados permitidos son: {$statusList}.",

            // Estimated Date
            'estimated_date.date' => 'La fecha estimada no tiene un formato válido. Use el formato DD/MM/AAAA.',
            'estimated_date.after_or_equal' => 'La fecha estimada no puede ser anterior a hoy.',

            // Technician
            'technician_id.integer' => 'El ID del técnico debe ser un número válido.',
            'technician_id.exists' => 'El técnico seleccionado no existe en el sistema.',

            // Cost
            'cost.numeric' => 'El costo debe ser un valor numérico (ej: 1500.50).',
            'cost.min' => 'El costo no puede ser negativo.',
            'cost.max' => 'El costo excede el máximo permitido.',

            // Sale Price
            'sale_price.numeric' => 'El precio de venta debe ser un valor numérico (ej: 2000.00).',
            'sale_price.min' => 'El precio de venta no puede ser negativo.',
            'sale_price.max' => 'El precio de venta excede el máximo permitido.',
            'sale_price_without_iva.numeric' => 'El precio sin IVA debe ser un valor numérico (ej: 1000.00).',
            'sale_price_without_iva.min' => 'El precio sin IVA no puede ser negativo.',
            'sale_price_without_iva.max' => 'El precio sin IVA excede el máximo permitido.',
            'iva_percentage.numeric' => 'El porcentaje de IVA debe ser numérico (ej: 21).',
            'sale_price_with_iva.numeric' => 'El precio con IVA debe ser un valor numérico (ej: 1210.00).',
            'sale_price_with_iva.min' => 'El precio con IVA no puede ser negativo.',
            'sale_price_with_iva.max' => 'El precio con IVA excede el máximo permitido.',

            // Sale
            'sale_id.integer' => 'El ID de la venta debe ser un número válido.',
            'sale_id.exists' => 'La venta asociada no existe en el sistema.',
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
            'cost' => 'costo',
            'sale_price' => 'precio de venta',
            'sale_price_without_iva' => 'precio sin IVA',
            'iva_percentage' => 'porcentaje de IVA',
            'sale_price_with_iva' => 'precio con IVA',
            'charge_with_iva' => 'cobrar con IVA',
            'sale_id' => 'venta asociada',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $net = $this->input('sale_price_without_iva');
            $gross = $this->input('sale_price_with_iva');
            $iva = $this->input('iva_percentage');

            if ($iva !== null && abs(((float) $iva) - self::FIXED_IVA_PERCENTAGE) > 0.01) {
                $validator->errors()->add(
                    'iva_percentage',
                    'El porcentaje de IVA es fijo en 21% para reparaciones.'
                );
                return;
            }

            if ($net === null || $gross === null || $iva === null) {
                return;
            }

            $netValue = (float) $net;
            $grossValue = (float) $gross;
            $ivaValue = (float) $iva;
            $expectedGross = round($netValue * (1 + ($ivaValue / 100)), 2);

            if (abs($grossValue - $expectedGross) > 0.01) {
                $validator->errors()->add(
                    'sale_price_with_iva',
                    'El precio con IVA no coincide con el cálculo esperado a partir del precio sin IVA y el porcentaje de IVA.'
                );
            }
        });
    }
}
