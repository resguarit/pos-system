<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GetAuditsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('ver_auditorias') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'user_id' => 'nullable|integer|exists:users,id',
            'subject_type' => 'nullable|string|max:255',
            'log_name' => 'nullable|string|max:255',
            'event' => 'nullable|string|max:255|in:created,updated,deleted',
            'search' => 'nullable|string|max:255',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'ip_address' => 'nullable|ip',
            'per_page' => 'nullable|integer|min:1|max:100',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'user_id.exists' => 'El usuario especificado no existe.',
            'date_to.after_or_equal' => 'La fecha hasta debe ser posterior o igual a la fecha desde.',
            'per_page.max' => 'El número de registros por página no puede ser mayor a 100.',
            'event.in' => 'El evento debe ser: created, updated o deleted.',
        ];
    }
}

