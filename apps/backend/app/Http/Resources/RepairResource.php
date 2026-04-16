<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class RepairResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $latestNoteAt = $this->latest_note_at ? Carbon::parse($this->latest_note_at) : null;
        $updatedAt = $this->updated_at ? Carbon::parse($this->updated_at) : null;
        $currentUserId = $request->user()?->id;
        $latestNoteUserId = $this->latest_note_user_id;
        
        // Only show as "new" if latest note was created by another user after last update
        $hasNewNotes = $latestNoteAt && $updatedAt && $latestNoteUserId
            ? ($latestNoteAt->greaterThan($updatedAt) && $latestNoteUserId !== $currentUserId)
            : false;

        return [
            'id' => $this->id,
            'code' => $this->code,
            'customer' => [
                'id' => $this->customer?->id,
                'name' => $this->customer?->person ? trim($this->customer->person->first_name . ' ' . $this->customer->person->last_name) : null,
                'phone' => $this->customer?->person?->phone ?? $this->customer?->phone,
                'email' => $this->customer?->email,
                'address' => $this->customer?->person?->address,
            ],
            'branch' => [
                'id' => $this->branch?->id,
                'description' => $this->branch?->description,
            ],
            'category' => [
                'id' => $this->category?->id,
                'name' => $this->category?->name,
                'description' => $this->category?->description,
            ],
            'technician' => [
                'id' => $this->technician?->id,
                'name' => $this->technician?->person ? trim($this->technician->person->first_name . ' ' . $this->technician->person->last_name) : ($this->technician?->username ?? null),
            ],
            'device' => $this->device,
            'serial_number' => $this->serial_number,
            'issue_description' => $this->issue_description,
            'diagnosis' => $this->diagnosis,
            'is_no_repair' => $this->is_no_repair ?? false,
            'no_repair_reason' => $this->no_repair_reason,
            'no_repair_at' => $this->no_repair_at?->toDateTimeString(),
            'priority' => $this->priority,
            'status' => $this->status,
            'intake_date' => optional($this->intake_date)->format('Y-m-d'),
            'estimated_date' => optional($this->estimated_date)->format('Y-m-d'),
            'cost' => $this->cost,
            'sale_price' => $this->sale_price,
            'sale_price_without_iva' => $this->sale_price_without_iva,
            'iva_percentage' => $this->iva_percentage,
            'sale_price_with_iva' => $this->sale_price_with_iva,
            'charge_with_iva' => $this->charge_with_iva,
            'initial_notes' => $this->initial_notes,
            'delivered_at' => optional($this->delivered_at)?->toDateTimeString(),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
            'notes_count' => $this->notes_count ?? ($this->notes ? $this->notes->count() : 0),
            'latest_note_at' => $latestNoteAt?->toDateTimeString(),
            'has_new_notes' => $hasNewNotes,
            'sale_id' => $this->sale_id,
            'sale' => $this->whenLoaded('sale', function () {
                return [
                    'id' => $this->sale?->id,
                    'receipt_number' => $this->sale?->receipt_number,
                ];
            }),
            'notes' => RepairNoteResource::collection($this->whenLoaded('notes')),
            // Siniestro (Insurance Claim) fields
            'is_siniestro' => $this->is_siniestro,
            'siniestro_number' => $this->siniestro_number,
            'policy_number' => $this->policy_number,
            'device_age' => $this->device_age,
            'insurer' => $this->whenLoaded('insurer', function () {
                return [
                    'id' => $this->insurer?->id,
                    'name' => $this->insurer?->name,
                ];
            }),
            'insured_customer' => $this->whenLoaded('insuredCustomer', function () {
                return [
                    'id' => $this->insuredCustomer?->id,
                    'name' => $this->insuredCustomer?->person ? ($this->insuredCustomer->person->first_name . ' ' . $this->insuredCustomer->person->last_name) : null,
                    'phone' => $this->insuredCustomer?->person?->phone ?? $this->insuredCustomer?->phone,
                    'email' => $this->insuredCustomer?->email,
                    'address' => $this->insuredCustomer?->person?->address,
                ];
            }),
            // Payment fields
            'is_paid' => $this->is_paid,
            'payment_status' => $this->payment_status ?? ($this->is_paid ? 'paid' : 'pending'),
            'amount_paid' => $this->amount_paid,
            'total_paid' => $this->total_paid ?? $this->amount_paid,
            'pending_amount' => $this->pending_amount,
            'paid_at' => $this->paid_at?->toDateTimeString(),
            'payment_method' => $this->whenLoaded('paymentMethod', function () {
                return [
                    'id' => $this->paymentMethod?->id,
                    'name' => $this->paymentMethod?->name,
                ];
            }),
            'payments' => $this->whenLoaded('payments', function () {
                return $this->payments->map(function ($payment) {
                    return [
                        'id' => $payment->id,
                        'amount' => $payment->amount,
                        'charge_with_iva' => $payment->charge_with_iva,
                        'paid_at' => $payment->paid_at?->toDateTimeString(),
                        'is_reversed' => (bool) $payment->is_reversed,
                        'reversed_at' => $payment->reversed_at?->toDateTimeString(),
                        'payment_method' => [
                            'id' => $payment->paymentMethod?->id,
                            'name' => $payment->paymentMethod?->name,
                        ],
                        'cash_movement_id' => $payment->cash_movement_id,
                    ];
                })->values();
            }),
            'cash_movement_id' => $this->cash_movement_id,
        ];
    }
}
