<?php

namespace App\Interfaces;

use App\Models\ShipmentStage;
use Illuminate\Database\Eloquent\Collection;

interface ShipmentStageServiceInterface
{
    /**
     * Get all active stages ordered by order field.
     */
    public function getStages(): Collection;

    /**
     * Create or update a stage.
     */
    public function upsertStage(array $data): ShipmentStage;

    /**
     * Delete a stage.
     */
    public function deleteStage(int $id): bool;

    /**
     * Configure visibility rules for a stage and role.
     */
    public function configureVisibility(int $stageId, int $roleId, array $rules): void;

    /**
     * Get visibility rules for a stage and role.
     */
    public function getVisibilityRules(int $stageId, int $roleId): Collection;

    /**
     * Check if user can access stage.
     */
    public function canUserAccessStage(int $stageId, int $roleId): bool;

    /**
     * Get visible attributes for user role in stage.
     */
    public function getVisibleAttributes(int $stageId, int $roleId): array;
}
