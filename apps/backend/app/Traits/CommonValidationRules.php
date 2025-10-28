<?php

declare(strict_types=1);

namespace App\Traits;

use Illuminate\Validation\Rule;

trait CommonValidationRules
{
    /**
     * Get common validation rules for user ID.
     */
    protected function getUserIdRules(bool $required = false): array
    {
        $rules = ['integer', 'exists:users,id'];
        
        if ($required) {
            array_unshift($rules, 'required');
        } else {
            array_unshift($rules, 'nullable');
        }
        
        return $rules;
    }

    /**
     * Get common validation rules for branch ID.
     */
    protected function getBranchIdRules(bool $required = true): array
    {
        $rules = ['integer', 'exists:branches,id'];
        
        if ($required) {
            array_unshift($rules, 'required');
        } else {
            array_unshift($rules, 'nullable');
        }
        
        return $rules;
    }

    /**
     * Get common validation rules for shipment stage ID.
     */
    protected function getShipmentStageIdRules(bool $required = false): array
    {
        $rules = ['integer', 'exists:shipment_stages,id'];
        
        if ($required) {
            array_unshift($rules, 'required');
        } else {
            array_unshift($rules, 'nullable');
        }
        
        return $rules;
    }

    /**
     * Get common validation rules for sale header ID.
     */
    protected function getSaleHeaderIdRules(bool $required = false): array
    {
        $rules = ['integer', 'exists:sales_header,id'];
        
        if ($required) {
            array_unshift($rules, 'required');
        } else {
            array_unshift($rules, 'nullable');
        }
        
        return $rules;
    }

    /**
     * Get common validation rules for role ID.
     */
    protected function getRoleIdRules(bool $required = false): array
    {
        $rules = ['integer', 'exists:roles,id'];
        
        if ($required) {
            array_unshift($rules, 'required');
        } else {
            array_unshift($rules, 'nullable');
        }
        
        return $rules;
    }

    /**
     * Get common validation rules for permission ID.
     */
    protected function getPermissionIdRules(bool $required = false): array
    {
        $rules = ['integer', 'exists:permissions,id'];
        
        if ($required) {
            array_unshift($rules, 'required');
        } else {
            array_unshift($rules, 'nullable');
        }
        
        return $rules;
    }

    /**
     * Get common validation rules for shipment status.
     */
    protected function getShipmentStatusRules(): array
    {
        return [
            'sometimes',
            'string',
            Rule::in(['pending', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'failed']),
        ];
    }

    /**
     * Get common validation rules for shipment priority.
     */
    protected function getShipmentPriorityRules(): array
    {
        return [
            'sometimes',
            'string',
            Rule::in(['low', 'normal', 'high', 'urgent']),
        ];
    }

    /**
     * Get common validation rules for shipment stage type.
     */
    protected function getShipmentStageTypeRules(): array
    {
        return [
            'required',
            'string',
            Rule::in(['pending', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'failed', 'returned']),
        ];
    }

    /**
     * Get common validation rules for shipment note type.
     */
    protected function getShipmentNoteTypeRules(): array
    {
        return [
            'sometimes',
            'string',
            Rule::in(['general', 'issue', 'update', 'delivery', 'customer', 'internal']),
        ];
    }

    /**
     * Get common validation rules for color (hex).
     */
    protected function getColorRules(): array
    {
        return ['nullable', 'string', 'max:7', 'regex:/^#[0-9A-Fa-f]{6}$/'];
    }

    /**
     * Get common validation rules for date fields.
     */
    protected function getDateRules(bool $required = false, bool $future = false): array
    {
        $rules = ['date'];
        
        if ($required) {
            array_unshift($rules, 'required');
        } else {
            array_unshift($rules, 'nullable');
        }
        
        if ($future) {
            $rules[] = 'after:now';
        }
        
        return $rules;
    }

    /**
     * Get common validation rules for text fields.
     */
    protected function getTextRules(int $maxLength = 1000, bool $required = false): array
    {
        $rules = ['string', "max:{$maxLength}"];
        
        if ($required) {
            array_unshift($rules, 'required');
        } else {
            array_unshift($rules, 'nullable');
        }
        
        return $rules;
    }

    /**
     * Get common validation rules for boolean fields.
     */
    protected function getBooleanRules(bool $required = false): array
    {
        $rules = ['boolean'];
        
        if ($required) {
            array_unshift($rules, 'required');
        } else {
            array_unshift($rules, 'nullable');
        }
        
        return $rules;
    }

    /**
     * Get common validation rules for integer fields.
     */
    protected function getIntegerRules(int $min = null, int $max = null, bool $required = false): array
    {
        $rules = ['integer'];
        
        if ($min !== null) {
            $rules[] = "min:{$min}";
        }
        
        if ($max !== null) {
            $rules[] = "max:{$max}";
        }
        
        if ($required) {
            array_unshift($rules, 'required');
        } else {
            array_unshift($rules, 'nullable');
        }
        
        return $rules;
    }

    /**
     * Get common validation rules for array fields.
     */
    protected function getArrayRules(bool $required = false): array
    {
        $rules = ['array'];
        
        if ($required) {
            array_unshift($rules, 'required');
        } else {
            array_unshift($rules, 'nullable');
        }
        
        return $rules;
    }

    /**
     * Get common validation rules for unique fields.
     */
    protected function getUniqueRules(string $table, string $column, $ignoreId = null): array
    {
        $rules = ['string', 'max:255'];
        
        if ($ignoreId !== null) {
            $rules[] = "unique:{$table},{$column}," . $ignoreId;
        } else {
            $rules[] = "unique:{$table},{$column}";
        }
        
        return $rules;
    }

    /**
     * Get common validation rules for ID arrays.
     */
    protected function getIdArrayRules(string $table, string $column = 'id'): array
    {
        return [
            'sometimes',
            'array',
            "{$column}.*" => "integer|exists:{$table},{$column}",
        ];
    }

    /**
     * Get common validation rules for metadata.
     */
    protected function getMetadataRules(): array
    {
        return ['nullable', 'array'];
    }

    /**
     * Get common validation rules for order field.
     */
    protected function getOrderRules(): array
    {
        return ['integer', 'min:0'];
    }

    /**
     * Get common validation rules for duration hours.
     */
    protected function getDurationHoursRules(int $max = 8760): array
    {
        return ['nullable', 'integer', 'min:0', "max:{$max}"];
    }
}



