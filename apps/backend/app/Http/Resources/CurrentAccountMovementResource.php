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
            'movement_type' => [
                'id' => $this->movementType->id,
                'name' => $this->movementType->name,
                'description' => $this->movementType->description,
                'operation_type' => $this->movementType->operation_type,
            ],
            'amount' => $this->amount,
            'description' => $this->description,
            'reference' => $this->reference,
            'sale_id' => $this->sale_id,
            'sale' => $this->when($this->sale_id, [
                'id' => $this->sale->id,
                'total' => $this->sale->total ?? null,
                'created_at' => $this->sale->created_at?->format('Y-m-d H:i:s'),
            ]),
            'balance_before' => $this->balance_before,
            'balance_after' => $this->balance_after,
            'metadata' => $this->metadata,
            'user_id' => $this->user_id,
            'user' => $this->when($this->user_id, [
                'id' => $this->user->id,
                'name' => $this->user_name,
            ]),
            'movement_date' => $this->movement_date?->format('Y-m-d H:i:s'),
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
            
            // Información adicional
            'operation_type' => $this->operation_type,
            'is_inflow' => $this->isInflow(),
            'is_outflow' => $this->isOutflow(),
        ];
    }
}