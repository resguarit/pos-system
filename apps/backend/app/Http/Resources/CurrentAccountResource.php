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
        // Calcular total de ventas pendientes (saldo adeudado)
        $currentAccountService = app(\App\Services\CurrentAccountService::class);
        // Usar pending_amount directamente del modelo SaleHeader
        $totalPendingSales = 0;
        if ($this->customer_id) {
            // Incluir todas las ventas EXCEPTO rechazadas
            // Las ventas anuladas que tengan saldo pendiente también se incluyen
            $sales = \App\Models\SaleHeader::where('customer_id', $this->customer_id)
                ->where('status', '!=', 'rejected') // Solo excluir rechazadas
                ->where(function($query) {
                    $query->whereNull('payment_status')
                          ->orWhereIn('payment_status', ['pending', 'partial']);
                })
                ->get();
            
            // Sumar el pending_amount de cada venta que tenga saldo pendiente
            foreach ($sales as $sale) {
                if ($sale->pending_amount > 0) {
                    $totalPendingSales += $sale->pending_amount;
                }
            }
        }
        
        // El saldo adeudado total es solo las ventas pendientes
        $totalPendingDebt = $totalPendingSales;
        
        return [
            'id' => $this->id,
            'customer_id' => $this->customer_id,
            'customer' => [
                'id' => $this->customer->id,
                'person_id' => $this->customer->person_id,
                'email' => $this->customer->email,
                'active' => $this->customer->active,
                'notes' => $this->customer->notes,
                'created_at' => $this->customer->created_at?->format('Y-m-d H:i:s'),
                'updated_at' => $this->customer->updated_at?->format('Y-m-d H:i:s'),
                'deleted_at' => $this->customer->deleted_at,
                'person' => $this->customer->person ? [
                    'id' => $this->customer->person->id,
                    'first_name' => $this->customer->person->first_name,
                    'last_name' => $this->customer->person->last_name,
                    'address' => $this->customer->person->address,
                    'city' => $this->customer->person->city ?? null,
                    'state' => $this->customer->person->state ?? null,
                    'postal_code' => $this->customer->person->postal_code ?? null,
                    'phone' => $this->customer->person->phone,
                    'cuit' => $this->customer->person->cuit,
                    'fiscal_condition_id' => $this->customer->person->fiscal_condition_id,
                    'person_type_id' => $this->customer->person->person_type_id,
                    'document_type_id' => $this->customer->person->document_type_id,
                    'documento' => $this->customer->person->documento,
                    'credit_limit' => $this->customer->person->credit_limit,
                    'person_type' => $this->customer->person->person_type ?? 'person',
                    'created_at' => $this->customer->person->created_at?->format('Y-m-d H:i:s'),
                    'updated_at' => $this->customer->person->updated_at?->format('Y-m-d H:i:s'),
                    'deleted_at' => $this->customer->person->deleted_at,
                ] : null,
            ],
            'credit_limit' => $this->credit_limit,
            'current_balance' => $this->current_balance,
            'total_pending_debt' => $totalPendingDebt, // Total de deuda pendiente (ventas + cargos administrativos)
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