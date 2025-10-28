<?php

namespace App\Interfaces;

use App\Models\Shipment;
use App\Models\ShipmentStage;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface ShipmentServiceInterface
{
    /**
     * Create a new shipment.
     */
    public function create(array $data, User $user): Shipment;

    /**
     * Get shipments with visibility filtering based on user role and stage.
     */
    public function getShipments(User $user, array $filters = []): LengthAwarePaginator;

    /**
     * Get a single shipment with visibility filtering.
     */
    public function getShipment(int $id, User $user): ?Shipment;

    /**
     * Move shipment to a new stage.
     */
    public function moveShipment(int $id, int $stageId, User $user, array $metadata = []): Shipment;

    /**
     * Update shipment metadata.
     */
    public function updateShipment(int $id, array $data, User $user): Shipment;

    /**
     * Delete a shipment.
     */
    public function deleteShipment(int $id, User $user): bool;

    /**
     * Register payment for a shipment.
     */
    public function payShipment(int $id, array $data, User $user): Shipment;

    /**
     * Get shipment events.
     */
    public function getShipmentEvents(int $shipmentId, User $user): Collection;

    /**
     * Process webhook for shipment.
     */
    public function processWebhook(int $shipmentId, array $payload, User $user): array;
}