<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RepairResource extends JsonResource
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
            'priority' => $this->priority,
            'status' => $this->status,
            'intake_date' => optional($this->intake_date)->format('Y-m-d'),
            'estimated_date' => optional($this->estimated_date)->format('Y-m-d'),
            'cost' => $this->cost,
            'sale_price' => $this->sale_price,
            'initial_notes' => $this->initial_notes,
            'delivered_at' => optional($this->delivered_at)?->toDateTimeString(),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
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
        ];
    }
}
