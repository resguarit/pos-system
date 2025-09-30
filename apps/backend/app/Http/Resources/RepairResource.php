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
                'name' => $this->customer?->person ? ($this->customer->person->first_name . ' ' . $this->customer->person->last_name) : null,
            ],
            'branch' => [
                'id' => $this->branch?->id,
                'description' => $this->branch?->description,
            ],
            'technician' => [
                'id' => $this->technician?->id,
                'name' => $this->technician?->name,
            ],
            'device' => $this->device,
            'serial_number' => $this->serial_number,
            'issue_description' => $this->issue_description,
            'priority' => $this->priority,
            'status' => $this->status,
            'intake_date' => optional($this->intake_date)->format('Y-m-d'),
            'estimated_date' => optional($this->estimated_date)->format('Y-m-d'),
            'cost' => $this->cost,
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
        ];
    }
}
