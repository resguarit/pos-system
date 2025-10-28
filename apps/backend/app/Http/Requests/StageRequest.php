<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('shipment.stage.create') || 
               $this->user()->can('shipment.stage.update') ||
               $this->user()->hasPermission('shipment.configure');
    }

    public function rules(): array
    {
        $stageId = $this->route('stage') ?? $this->input('id');
        
        return [
            'name' => 'required|string|unique:shipment_stages,name,' . $stageId,
            'order' => 'required|integer|min:0',
            'config' => 'nullable|array',
            'config.color' => 'nullable|string',
            'config.allowed_transitions' => 'nullable|array',
            'config.allowed_transitions.*' => 'exists:shipment_stages,id'
        ];
    }
}
