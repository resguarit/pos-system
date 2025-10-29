<?php

namespace App\Services;

use App\Interfaces\ShipmentStageServiceInterface;
use App\Models\ShipmentStage;
use App\Models\ShipmentRoleAttributeVisibility;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ShipmentStageService implements ShipmentStageServiceInterface
{
    public function getStages(): Collection
    {
        return ShipmentStage::where('is_active', true)
            ->orderBy('order')
            ->get();
    }

    public function upsertStage(array $data): ShipmentStage
    {
        return DB::transaction(function () use ($data) {
            if (isset($data['id'])) {
                $stage = ShipmentStage::findOrFail($data['id']);
                $stage->update([
                    'name' => $data['name'],
                    'description' => $data['description'] ?? null,
                    'order' => $data['order'] ?? $stage->order,
                    'config' => $data['config'] ?? $stage->config,
                    'is_active' => $data['is_active'] ?? $stage->is_active,
                ]);
            } else {
                $stage = ShipmentStage::create([
                    'name' => $data['name'],
                    'description' => $data['description'] ?? null,
                    'order' => $data['order'] ?? 0,
                    'config' => $data['config'] ?? [],
                    'is_active' => $data['is_active'] ?? true,
                ]);
            }

            return $stage;
        });
    }

    public function deleteStage(int $id): bool
    {
        return DB::transaction(function () use ($id) {
            $stage = ShipmentStage::findOrFail($id);

            // Check if stage is in use
            if ($stage->shipments()->exists()) {
                throw new \Exception('Cannot delete stage that is currently in use');
            }

            return $stage->delete();
        });
    }

    public function configureVisibility(int $stageId, int $roleId, array $rules): void
    {
        DB::transaction(function () use ($stageId, $roleId, $rules) {
            // Delete existing rules
            ShipmentRoleAttributeVisibility::where('stage_id', $stageId)
                ->where('role_id', $roleId)
                ->delete();

            // Create new rules
            foreach ($rules as $attribute => $visible) {
                ShipmentRoleAttributeVisibility::create([
                    'stage_id' => $stageId,
                    'role_id' => $roleId,
                    'attribute' => $attribute,
                    'visible' => (bool) $visible,
                ]);
            }
        });
    }

    public function getVisibilityRules(int $stageId, int $roleId): Collection
    {
        return ShipmentRoleAttributeVisibility::where('stage_id', $stageId)
            ->where('role_id', $roleId)
            ->get();
    }

    public function canUserAccessStage(int $stageId, int $roleId): bool
    {
        return \App\Models\Role::find($roleId)
            ->shipmentStages()
            ->where('shipment_stages.id', $stageId)
            ->exists();
    }

    public function getVisibleAttributes(int $stageId, int $roleId): array
    {
        $rules = $this->getVisibilityRules($stageId, $roleId);
        
        $visibleAttributes = [];
        foreach ($rules as $rule) {
            if ($rule->visible) {
                $visibleAttributes[] = $rule->attribute;
            }
        }

        return $visibleAttributes;
    }
}
