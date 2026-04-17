<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubcontractedServiceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'repair_id' => $this->repair_id,
            'repair_code' => $this->repair?->code,
            'supplier_id' => $this->supplier_id,
            'supplier_name' => $this->supplier?->name,
            'current_account_id' => $this->current_account_id,
            'description' => $this->description,
            'notes' => $this->notes,
            'agreed_cost' => (float) $this->agreed_cost,
            'paid_amount' => (float) $this->paid_amount,
            'pending_amount' => (float) $this->pending_amount,
            'payment_status' => $this->payment_status,
            'fully_paid_at' => $this->fully_paid_at?->toDateTimeString(),
            'charge_movement_id' => $this->charge_movement_id,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
            'payments' => $this->whenLoaded('payments', function () {
                return $this->payments->map(function ($payment) {
                    return [
                        'id' => $payment->id,
                        'amount' => (float) $payment->amount,
                        'paid_at' => $payment->paid_at?->toDateTimeString(),
                        'notes' => $payment->notes,
                        'payment_method' => [
                            'id' => $payment->paymentMethod?->id,
                            'name' => $payment->paymentMethod?->name,
                        ],
                        'current_account_movement_id' => $payment->current_account_movement_id,
                        'user_id' => $payment->user_id,
                    ];
                })->values();
            }),
        ];
    }
}
