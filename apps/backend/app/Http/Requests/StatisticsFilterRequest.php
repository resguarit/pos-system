<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form Request para validar filtros de estadísticas avanzadas.
 */
class StatisticsFilterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'start_date' => ['nullable', 'date', 'before_or_equal:end_date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'product_search' => ['nullable', 'string', 'max:255'],
            'hour_from' => ['nullable', 'integer', 'min:0', 'max:23'],
            'hour_to' => ['nullable', 'integer', 'min:0', 'max:23'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'start_date.before_or_equal' => 'La fecha de inicio debe ser anterior o igual a la fecha fin.',
            'end_date.after_or_equal' => 'La fecha fin debe ser posterior o igual a la fecha de inicio.',
            'hour_from.min' => 'La hora de inicio debe ser entre 0 y 23.',
            'hour_to.max' => 'La hora de fin debe ser entre 0 y 23.',
            'limit.min' => 'El límite debe ser al menos 1.',
            'limit.max' => 'El límite no puede ser mayor a 100.',
        ];
    }

    /**
     * Retorna los filtros validados como un DTO tipado.
     */
    public function filters(): array
    {
        return [
            'start_date' => $this->validated('start_date'),
            'end_date' => $this->validated('end_date'),
            'branch_id' => $this->validated('branch_id') ? (int) $this->validated('branch_id') : null,
            'user_id' => $this->validated('user_id') ? (int) $this->validated('user_id') : null,
            'category_id' => $this->validated('category_id') ? (int) $this->validated('category_id') : null,
            'supplier_id' => $this->validated('supplier_id') ? (int) $this->validated('supplier_id') : null,
            'product_search' => $this->validated('product_search'),
            'hour_from' => $this->validated('hour_from') !== null ? (int) $this->validated('hour_from') : null,
            'hour_to' => $this->validated('hour_to') !== null ? (int) $this->validated('hour_to') : null,
            'limit' => $this->validated('limit') ? (int) $this->validated('limit') : 20,
        ];
    }
}
