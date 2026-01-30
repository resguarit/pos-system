<?php

namespace App\Services;

use App\Exceptions\ConflictException;
use App\Exceptions\PermissionDeniedException;
use App\Interfaces\ShipmentServiceInterface;
use App\Models\Shipment;
use App\Models\ShipmentStage;
use App\Models\User;
use App\Models\SaleHeader;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ShipmentService implements ShipmentServiceInterface
{
    public function create(array $data, User $user): Shipment
    {
        return DB::transaction(function () use ($data, $user) {
            // Generate unique sequential reference
            if (!isset($data['reference'])) {
                // Find the highest existing reference number
                $lastShipment = Shipment::where('reference', 'LIKE', 'E-%')
                    ->orderByRaw('CAST(SUBSTRING(reference, 3) AS UNSIGNED) DESC')
                    ->first();

                if ($lastShipment && preg_match('/^E-(\d+)$/', $lastShipment->reference, $matches)) {
                    $nextNumber = intval($matches[1]) + 1;
                } else {
                    $nextNumber = 1;
                }

                $reference = 'E-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

                // Ensure uniqueness (in case of race condition)
                while (Shipment::where('reference', $reference)->exists()) {
                    $nextNumber++;
                    $reference = 'E-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
                }
            } else {
                $reference = $data['reference'];
            }

            // Get initial stage
            $initialStage = ShipmentStage::where('order', 1)->where('is_active', true)->first();
            if (!$initialStage) {
                throw new \Exception('No initial shipment stage found');
            }

            // Use branch_id from request if provided, otherwise use user's first branch
            $branchId = $data['branch_id'] ?? $user->branches()->first()?->id;

            // Create shipment
            $shipment = Shipment::create([
                'reference' => $reference,
                'metadata' => $data['metadata'] ?? [],
                'current_stage_id' => $initialStage->id,
                'created_by' => $user->id,
                'branch_id' => $branchId,
                'shipping_address' => $data['shipping_address'] ?? null,
                'shipping_city' => $data['shipping_city'] ?? null,
                'shipping_state' => $data['shipping_state'] ?? null,
                'shipping_postal_code' => $data['shipping_postal_code'] ?? null,
                'shipping_country' => $data['shipping_country'] ?? null,
                'priority' => $data['priority'] ?? 'normal',
                'estimated_delivery_date' => $data['estimated_delivery_date'] ?? null,
                'notes' => $data['notes'] ?? null,
                'shipping_cost' => $data['shipping_cost'] ?? 0,
                'is_paid' => false,
            ]);

            // Attach sales if provided
            if (isset($data['sale_ids']) && is_array($data['sale_ids'])) {
                $sales = SaleHeader::whereIn('id', $data['sale_ids'])->get();
                $shipment->sales()->attach($sales->pluck('id'));
            }

            return $shipment;
        });
    }

    public function getShipments(User $user, array $filters = []): LengthAwarePaginator
    {
        $perPage = $filters['per_page'] ?? 10;

        $query = Shipment::with([
            'currentStage',
            'creator.person',
            'sales.customer.person',
            'sales.receiptType'
        ])
            ->where('branch_id', $user->branches()->first()?->id)
            ->withCount('sales');

        // Apply filters
        if (isset($filters['stage_id'])) {
            $query->where('current_stage_id', $filters['stage_id']);
        }

        if (isset($filters['reference'])) {
            $query->where('reference', 'like', '%' . $filters['reference'] . '%');
        }

        if (isset($filters['created_from'])) {
            $query->where('created_at', '>=', \Carbon\Carbon::parse($filters['created_from'])->startOfDay()->setTimezone('UTC'));
        }

        if (isset($filters['created_to'])) {
            $query->where('created_at', '<=', \Carbon\Carbon::parse($filters['created_to'])->endOfDay()->setTimezone('UTC'));
        }

        $shipments = $query->orderBy('created_at', 'desc')->paginate($perPage);

        // Eager load transporter users
        foreach ($shipments->items() as $shipment) {
            if (isset($shipment->metadata['transportista_id'])) {
                $shipment->transporter = User::with('person')->find($shipment->metadata['transportista_id']);
            }
        }

        // Apply visibility filtering
        return $this->filterShipmentsByVisibility($shipments, $user);
    }

    public function getShipment(int $id, User $user): ?Shipment
    {
        $shipment = Shipment::with([
            'currentStage',
            'creator.person',
            'sales.customer.person',
            'sales.receiptType',
            'sales.items.product',
            'events'
        ])
            ->where('branch_id', $user->branches()->first()?->id)
            ->find($id);

        if (!$shipment) {
            return null;
        }

        // Eager load transporter user
        if (isset($shipment->metadata['transportista_id'])) {
            $shipment->transporter = User::with('person')->find($shipment->metadata['transportista_id']);
        }

        // Apply visibility filtering
        return $this->filterShipmentByVisibility($shipment, $user);
    }

    public function moveShipment(int $id, int $stageId, User $user, array $metadata = []): Shipment
    {
        return DB::transaction(function () use ($id, $stageId, $user, $metadata) {
            $shipment = Shipment::where('tenant_id', $user->branches()->first()?->id)->findOrFail($id);
            $newStage = ShipmentStage::findOrFail($stageId);

            // Check permissions
            if (!$this->canUserMoveShipment($shipment, $newStage, $user)) {
                throw new PermissionDeniedException('You do not have permission to move this shipment to the specified stage');
            }

            // Optimistic locking check
            if (isset($metadata['version']) && $shipment->version !== $metadata['version']) {
                throw new ConflictException('Shipment has been modified by another user');
            }

            $oldStage = $shipment->currentStage;
            $shipment->moveToStage($newStage, $user, $metadata);

            return $shipment->fresh();
        });
    }

    public function updateShipment(int $id, array $data, User $user): Shipment
    {
        return DB::transaction(function () use ($id, $data, $user) {
            $shipment = Shipment::where('branch_id', $user->branches()->first()?->id)->findOrFail($id);

            // Check permissions
            if (!$this->canUserUpdateShipment($shipment, $user)) {
                throw new PermissionDeniedException('You do not have permission to update this shipment');
            }

            // Optimistic locking check
            if (isset($data['version']) && $shipment->version !== $data['version']) {
                throw new ConflictException('Shipment has been modified by another user');
            }

            $updateData = [
                'metadata' => $data['metadata'] ?? $shipment->metadata,
            ];

            // Update shipping fields if provided
            if (isset($data['shipping_address'])) {
                $updateData['shipping_address'] = $data['shipping_address'];
            }
            if (isset($data['shipping_city'])) {
                $updateData['shipping_city'] = $data['shipping_city'];
            }
            if (isset($data['shipping_state'])) {
                $updateData['shipping_state'] = $data['shipping_state'];
            }
            if (isset($data['shipping_postal_code'])) {
                $updateData['shipping_postal_code'] = $data['shipping_postal_code'];
            }
            if (isset($data['shipping_country'])) {
                $updateData['shipping_country'] = $data['shipping_country'];
            }
            if (isset($data['priority'])) {
                $updateData['priority'] = $data['priority'];
            }
            if (isset($data['estimated_delivery_date'])) {
                $updateData['estimated_delivery_date'] = $data['estimated_delivery_date'];
            }
            if (isset($data['notes'])) {
                $updateData['notes'] = $data['notes'];
            }
            if (isset($data['current_stage_id'])) {
                $updateData['current_stage_id'] = $data['current_stage_id'];
            }
            if (isset($data['shipping_cost'])) {
                $updateData['shipping_cost'] = $data['shipping_cost'];
            }

            $shipment->update($updateData);

            // Update associated sales if provided
            if (isset($data['sale_ids']) && is_array($data['sale_ids'])) {
                $shipment->sales()->sync($data['sale_ids']);
            }

            // Si se actualizó el cliente en la metadata, actualizar las ventas asociadas
            if (isset($updateData['metadata']) && isset($updateData['metadata']['cliente_id'])) {
                $clientId = $updateData['metadata']['cliente_id'];
                if ($clientId) {
                    // Recargar las ventas para asegurar que tenemos las correctas (incluyendo las recién sincronizadas)
                    $shipment->load('sales');
                    foreach ($shipment->sales as $sale) {
                        $sale->customer_id = $clientId;
                        $sale->save();
                    }
                }
            }

            $shipment->incrementVersion();

            return $shipment->fresh(['currentStage', 'creator.person', 'sales.customer.person', 'sales.receiptType']);
        });
    }

    public function deleteShipment(int $id, User $user): bool
    {
        return DB::transaction(function () use ($id, $user) {
            $shipment = Shipment::where('branch_id', $user->branches()->first()?->id)->findOrFail($id);

            // Check permissions - simplificado para permitir con cancelar_envio o editar_envios
            $allowed = $user->hasPermission('cancelar_envio') || $user->hasPermission('editar_envios');

            if (!$allowed) {
                throw new PermissionDeniedException('You do not have permission to delete this shipment');
            }

            // Buscar la etapa "Cancelado" o crear una nueva
            $cancelledStage = ShipmentStage::where('name', 'LIKE', '%Cancelado%')->first();

            if (!$cancelledStage) {
                // Crear una etapa "Cancelado" si no existe
                $cancelledStage = ShipmentStage::create([
                    'name' => 'Cancelado',
                    'description' => 'Envío cancelado por el usuario',
                    'order' => 999,
                    'type' => 'cancelled',
                    'color' => '#EF4444',
                    'icon' => 'x',
                    'is_active' => 1,
                    'is_initial' => 0,
                    'is_final' => 1,
                    'estimated_duration_hours' => 0,
                    'requires_confirmation' => 0,
                    'auto_transition' => 0,
                ]);
            }

            // Actualizar el estado a "Cancelado" en lugar de eliminar
            $shipment->update([
                'current_stage_id' => $cancelledStage->id,
                'notes' => ($shipment->notes ? $shipment->notes . "\n\n" : '') . "Envío cancelado por " . $user->username . " el " . now()->format('Y-m-d H:i:s'),
            ]);

            $shipment->incrementVersion();

            return true;
        });
    }

    public function payShipment(int $id, array $data, User $user): Shipment
    {
        return DB::transaction(function () use ($id, $data, $user) {
            // Find the shipment
            $shipment = Shipment::findOrFail($id);

            // Check permissions
            if (!$user->hasPermission('editar_envios')) {
                throw new PermissionDeniedException('You do not have permission to pay this shipment');
            }

            // Verify the shipment has a shipping cost
            if (!$shipment->shipping_cost || $shipment->shipping_cost == 0) {
                throw new \Exception('This shipment has no shipping cost to pay');
            }

            // Check if already paid
            if ($shipment->is_paid) {
                throw new \Exception('This shipment is already paid');
            }

            // Get the branch where the shipment was created
            $branch = $shipment->branch;

            if (!$branch) {
                throw new \Exception('Shipment has no associated branch');
            }

            // Get the open cash register for the shipment's branch
            // Primero intentar buscar la caja del usuario que está registrando el pago
            $cashRegister = $branch->cashRegisters()
                ->where('status', 'open')
                ->where('user_id', $user->id)
                ->first();

            // Si no hay caja del usuario, buscar cualquier caja abierta de la sucursal
            if (!$cashRegister) {
                $cashRegister = $branch->cashRegisters()
                    ->where('status', 'open')
                    ->first();
            }

            if (!$cashRegister) {
                throw new \Exception('No cash register is open for this branch');
            }

            // Find or create the income movement type
            $movementType = \App\Models\MovementType::firstOrCreate(
                ['name' => 'Pago de envío'],
                [
                    'description' => 'Ingreso por pago de costo de envío',
                    'operation_type' => 'entrada',
                    'is_cash_movement' => true,
                    'is_current_account_movement' => false,
                    'active' => true,
                ]
            );

            // Create cash movement for the payment using CashMovement model
            \App\Models\CashMovement::create([
                'cash_register_id' => $cashRegister->id,
                'movement_type_id' => $movementType->id,
                'payment_method_id' => $data['payment_method_id'],
                'amount' => abs($shipment->shipping_cost),
                'description' => 'Pago de envío ' . $shipment->reference,
                'notes' => $data['notes'] ?? null,
                'user_id' => $user->id,
                'reference_type' => 'shipment',
                'reference_id' => $shipment->id,
            ]);

            // Update cash register calculated fields
            $cashRegister->updateCalculatedFields();

            // Mark shipment as paid
            $shipment->update([
                'is_paid' => true,
                'payment_date' => now(),
            ]);

            // Update notes if provided
            if (isset($data['notes']) && !empty($data['notes'])) {
                $currentNotes = $shipment->notes ?? '';
                $shipment->update([
                    'notes' => $currentNotes . ($currentNotes ? "\n\n" : '') .
                        "Pago registrado: " . $data['notes'],
                ]);
            }

            $shipment->incrementVersion();

            return $shipment->fresh(['currentStage', 'creator.person', 'sales.customer.person', 'sales.receiptType']);
        });
    }

    public function getShipmentEvents(int $shipmentId, User $user): Collection
    {
        $shipment = Shipment::where('tenant_id', $user->branches()->first()?->id)->findOrFail($shipmentId);

        if (!$this->canUserViewShipment($shipment, $user)) {
            throw new PermissionDeniedException('You do not have permission to view this shipment');
        }

        return $shipment->events()->with(['user', 'fromStage', 'toStage'])->get();
    }

    public function processWebhook(int $shipmentId, array $payload, User $user): array
    {
        $shipment = Shipment::where('tenant_id', $user->branches()->first()?->id)->findOrFail($shipmentId);

        // Process webhook payload
        $result = [
            'status' => 'processed',
            'shipment_id' => $shipment->id,
            'payload' => $payload,
        ];

        // Fire event for webhook processing
        event(new ShipmentFailed($shipment, $user, $payload));

        return $result;
    }

    /**
     * Check if user can move shipment to new stage.
     */
    private function canUserMoveShipment(Shipment $shipment, ShipmentStage $newStage, User $user): bool
    {
        // Check if user has permission to move shipments
        if (!$user->hasPermission('shipment.move')) {
            return false;
        }

        // Check if user's role can access the new stage
        if (!$user->role) {
            return false;
        }

        return $user->role->shipmentStages()->where('shipment_stages.id', $newStage->id)->exists();
    }

    /**
     * Check if user can update shipment.
     */
    private function canUserUpdateShipment(Shipment $shipment, User $user): bool
    {
        // Check for edit permission or view permission
        return $user->hasPermission('editar_envios') || $user->hasPermission('ver_envios');
    }

    /**
     * Check if user can delete shipment.
     */
    private function canUserDeleteShipment(Shipment $shipment, User $user): bool
    {
        // Check for cancel permission or edit permission
        return $user->hasPermission('cancelar_envio') || $user->hasPermission('editar_envios');
    }

    /**
     * Check if user can view shipment.
     */
    private function canUserViewShipment(Shipment $shipment, User $user): bool
    {
        if (!$user->role) {
            return false;
        }

        return $user->role->shipmentStages()->where('shipment_stages.id', $shipment->current_stage_id)->exists();
    }

    /**
     * Filter shipments by visibility rules.
     */
    private function filterShipmentsByVisibility(LengthAwarePaginator $shipments, User $user): LengthAwarePaginator
    {
        $shipments->getCollection()->transform(function ($shipment) use ($user) {
            return $this->filterShipmentByVisibility($shipment, $user);
        });

        return $shipments;
    }

    /**
     * Filter single shipment by visibility rules.
     */
    private function filterShipmentByVisibility(Shipment $shipment, User $user): Shipment
    {
        // If user has no role, return shipment as-is
        if (!$user->role) {
            return $shipment;
        }

        $visibilityRules = $user->role->shipmentVisibilityRules()
            ->where('stage_id', $shipment->current_stage_id)
            ->get();

        // If no visibility rules are configured, return shipment as-is
        if ($visibilityRules->isEmpty()) {
            return $shipment;
        }

        $rulesKeyedByAttribute = $visibilityRules->keyBy('attribute');

        // Define essential fields that must always be visible for UI functionality
        $essentialFields = [
            'id',
            'reference',
            'current_stage_id',
            'version',
            'created_by',
            'branch_id',
            'tenant_id',
            'created_at',
            'updated_at',
            'current_stage',
            'creator',
            'sales'
        ];

        // Get shipment as array
        $shipmentArray = $shipment->toArray();
        $filteredArray = [];

        foreach ($shipmentArray as $key => $value) {
            // Always include essential fields
            if (in_array($key, $essentialFields)) {
                $filteredArray[$key] = $value;
                continue;
            }

            // Check visibility rules for non-essential fields
            $rule = $rulesKeyedByAttribute->get($key);
            if (!$rule || $rule->visible) {
                $filteredArray[$key] = $value;
            }
        }

        // Filter sales attributes if present and rules exist
        if (isset($filteredArray['sales']) && $shipment->sales && !$shipment->sales->isEmpty()) {
            $filteredArray['sales'] = $this->filterSalesByVisibility($shipment->sales, $user, $shipment->current_stage_id);
        }

        // Create a new shipment instance with filtered data
        $filteredShipment = new Shipment($filteredArray);
        $filteredShipment->exists = true;

        return $filteredShipment;
    }

    /**
     * Filter sales by visibility rules.
     */
    private function filterSalesByVisibility($sales, User $user, int $stageId): array
    {
        if (!$user->role) {
            return $sales->toArray();
        }

        $visibilityRules = $user->role->shipmentVisibilityRules()
            ->where('stage_id', $stageId)
            ->where('attribute', 'like', 'sale.%')
            ->get()
            ->keyBy(function ($rule) {
                return str_replace('sale.', '', $rule->attribute);
            });

        return $sales->map(function ($sale) use ($visibilityRules) {
            $saleArray = $sale->toArray();
            $filteredSale = [];

            foreach ($saleArray as $key => $value) {
                $rule = $visibilityRules->get($key);
                if (!$rule || $rule->visible) {
                    $filteredSale[$key] = $value;
                }
            }

            return $filteredSale;
        })->toArray();
    }
}