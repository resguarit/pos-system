<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CurrentAccountMovementResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'current_account_id' => $this->current_account_id,
            'movement_type_id' => $this->movement_type_id,
            'movement_type' => $this->when(
                $this->movementType !== null,
                fn() => [
                    'id' => $this->movementType->id ?? null,
                    'name' => $this->movementType->name ?? 'Sin tipo',
                    'description' => $this->movementType->description ?? null,
                    'operation_type' => $this->movementType->operation_type ?? 'unknown',
                ]
            ),
            'amount' => (float) $this->amount,
            'description' => $this->description,
            'reference' => $this->reference,
            'sale_id' => $this->sale_id,
            'sale' => $this->when(
                $this->sale_id !== null && $this->sale !== null,
                fn() => [
                    'id' => $this->sale->id ?? null,
                    'total' => $this->sale->total ?? null,
                    'created_at' => $this->sale->created_at?->format('Y-m-d H:i:s'),
                ]
            ),
            'balance_before' => (float) $this->balance_before,
            'balance_after' => (float) $this->balance_after,
            'metadata' => $this->metadata,
            'user_id' => $this->user_id,
            'user' => $this->when(
                $this->user_id !== null && $this->user !== null,
                fn() => [
                    'id' => $this->user->id ?? null,
                    'name' => $this->getUserName(),
                ]
            ),
            'movement_date' => $this->movement_date?->format('Y-m-d H:i:s'),
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
            
            // Información adicional
            'operation_type' => $this->getOperationType(),
            'is_inflow' => $this->isInflow(),
            'is_outflow' => $this->isOutflow(),
        ];
    }

    /**
     * Obtener el tipo de operación de forma segura
     */
    private function getOperationType(): string
    {
        if ($this->movementType !== null) {
            return $this->movementType->operation_type ?? 'unknown';
        }
        return 'unknown';
    }

    /**
     * Obtener el nombre del usuario de forma segura
     */
    private function getUserName(): string
    {
        if ($this->user === null) {
            return 'Sistema';
        }
        
        if ($this->user->person !== null) {
            return $this->user->person->full_name ?? 
                   trim(($this->user->person->first_name ?? '') . ' ' . ($this->user->person->last_name ?? '')) ?: 
                   'Usuario sin nombre';
        }
        
        return $this->user->username ?? 'Usuario';
    }
}