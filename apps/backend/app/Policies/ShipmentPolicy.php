<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Shipment;
use App\Models\ShipmentStage;

class ShipmentPolicy
{
    /**
     * Determine whether the user can view any shipments.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('ver_envios');
    }

    /**
     * Determine whether the user can view the shipment.
     */
    public function view(User $user, Shipment $shipment): bool
    {
        // Check if user has basic view permission
        if (!$user->hasPermission('ver_envios')) {
            return false;
        }

        // Check if user can access the current stage
        if (!$user->role) {
            return false;
        }

        return $user->role->shipmentStages()
            ->where('shipment_stages.id', $shipment->current_stage_id)
            ->exists();
    }

    /**
     * Determine whether the user can create shipments.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('crear_envios') || $user->hasPermission('ver_envios');
    }

    /**
     * Determine whether the user can update the shipment.
     */
    public function update(User $user, Shipment $shipment): bool
    {
        // User can update if they have edit permission or created it
        return $user->hasPermission('editar_envios') || $shipment->created_by === $user->id || $user->hasPermission('ver_envios');
    }

    /**
     * Determine whether the user can delete the shipment.
     */
    public function delete(User $user, Shipment $shipment): bool
    {
        // User can delete if they have cancel permission or edit permission
        return $user->hasPermission('cancelar_envio') || $user->hasPermission('editar_envios');
    }

    /**
     * Determine whether the user can move the shipment.
     */
    public function move(User $user, Shipment $shipment): bool
    {
        // Check if user has move permission
        if (!$user->hasPermission('mover_envios')) {
            return false;
        }

        // Check if user can access the current stage
        if (!$user->role) {
            return false;
        }

        return $user->role->shipmentStages()
            ->where('shipment_stages.id', $shipment->current_stage_id)
            ->exists();
    }

    /**
     * Determine whether the user can move shipment to a specific stage.
     */
    public function moveToStage(User $user, Shipment $shipment, ShipmentStage $stage): bool
    {
        // Check if user has move permission
        if (!$user->hasPermission('mover_envios')) {
            return false;
        }

        // Check if user can access the target stage
        if (!$user->role) {
            return false;
        }

        return $user->role->shipmentStages()
            ->where('shipment_stages.id', $stage->id)
            ->exists();
    }

    /**
     * Determine whether the user can configure shipment stages.
     */
    public function configure(User $user): bool
    {
        return $user->hasPermission('configurar_envios');
    }

    /**
     * Determine whether the user can manage stages.
     */
    public function manageStages(User $user): bool
    {
        return $user->hasPermission('crear_etapas_envio') ||
               $user->hasPermission('editar_etapas_envio') ||
               $user->hasPermission('eliminar_etapas_envio');
    }

    /**
     * Determine whether the user can configure visibility.
     */
    public function configureVisibility(User $user): bool
    {
        return $user->hasPermission('configurar_visibilidad_atributos');
    }
}