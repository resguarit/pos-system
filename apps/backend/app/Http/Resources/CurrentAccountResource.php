<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CurrentAccountResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer_id' => $this->customer_id,
            'customer' => [
                'id' => $this->customer->id,
                'name' => $this->customer->full_name,
                'email' => $this->customer->email,
                'phone' => $this->customer->person->phone ?? null,
                'address' => $this->customer->person->address ?? null,
            ],
            'credit_limit' => $this->credit_limit,
            'current_balance' => $this->current_balance,
            'available_credit' => $this->available_credit,
            'credit_usage_percentage' => $this->credit_usage_percentage,
            'status' => $this->status,
            'status_text' => $this->status_text,
            'notes' => $this->notes,
            'opened_at' => $this->opened_at?->format('Y-m-d H:i:s'),
            'closed_at' => $this->closed_at?->format('Y-m-d H:i:s'),
            'last_movement_at' => $this->last_movement_at?->format('Y-m-d H:i:s'),
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
            
            // Información adicional cuando se incluye
            'movements_count' => $this->whenLoaded('movements', function () {
                return $this->movements->count();
            }),
            'recent_movements' => $this->whenLoaded('movements', function () {
                return $this->movements->take(5)->map(function ($movement) {
                    return [
                        'id' => $movement->id,
                        'amount' => $movement->amount,
                        'description' => $movement->description,
                        'movement_type' => $movement->movement_type_name,
                        'operation_type' => $movement->operation_type,
                        'movement_date' => $movement->movement_date?->format('Y-m-d H:i:s'),
                        'balance_after' => $movement->balance_after,
                    ];
                });
            }),
        ];
    }
}