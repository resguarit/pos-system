<?php

namespace Database\Seeders;

use App\Models\ShipmentStage;
use App\Models\Role;
use App\Models\ShipmentRoleAttributeVisibility;
use Illuminate\Database\Seeder;

class ShipmentDemoDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create demo stages
        $stages = [
            [
                'name' => 'Preparación',
                'description' => 'Envío en preparación',
                'order' => 1,
                'color' => '#fbbf24',
                'icon' => 'package',
                'is_active' => true,
                'is_initial' => true,
                'is_final' => false,
            ],
            [
                'name' => 'En Ruta',
                'description' => 'Envío en camino',
                'order' => 2,
                'color' => '#3b82f6',
                'icon' => 'truck',
                'is_active' => true,
                'is_initial' => false,
                'is_final' => false,
            ],
            [
                'name' => 'Entregado',
                'description' => 'Envío entregado',
                'order' => 3,
                'color' => '#10b981',
                'icon' => 'check-circle',
                'is_active' => true,
                'is_initial' => false,
                'is_final' => true,
            ],
            [
                'name' => 'Cancelado',
                'description' => 'Envío cancelado',
                'order' => 4,
                'color' => '#ef4444',
                'icon' => 'x-circle',
                'is_active' => true,
                'is_initial' => false,
                'is_final' => true,
            ],
        ];

        $createdStages = [];
        foreach ($stages as $stageData) {
            $stage = ShipmentStage::firstOrCreate(
                ['name' => $stageData['name']],
                $stageData
            );
            $createdStages[] = $stage;
        }

        // Get roles
        $adminRole = Role::where('name', 'admin')->first();
        $logisticsManagerRole = Role::where('name', 'logistics_manager')->first();
        $driverRole = Role::where('name', 'driver')->first();
        $warehouseOperatorRole = Role::where('name', 'warehouse_operator')->first();

        // Create roles if they don't exist
        if (!$adminRole) {
            $adminRole = Role::create([
                'name' => 'admin',
                'description' => 'Administrator',
                'active' => true,
            ]);
        }

        if (!$logisticsManagerRole) {
            $logisticsManagerRole = Role::create([
                'name' => 'logistics_manager',
                'description' => 'Logistics Manager',
                'active' => true,
            ]);
        }

        if (!$driverRole) {
            $driverRole = Role::create([
                'name' => 'driver',
                'description' => 'Driver',
                'active' => true,
            ]);
        }

        if (!$warehouseOperatorRole) {
            $warehouseOperatorRole = Role::create([
                'name' => 'warehouse_operator',
                'description' => 'Warehouse Operator',
                'active' => true,
            ]);
        }

        // Assign permissions to roles
        $this->assignPermissionsToRoles();

        // Assign stages to roles
        $roleStageAssignments = [
            'admin' => ['Preparación', 'En Ruta', 'Entregado', 'Cancelado'],
            'logistics_manager' => ['Preparación', 'En Ruta', 'Entregado', 'Cancelado'],
            'driver' => ['En Ruta', 'Entregado'],
            'warehouse_operator' => ['Preparación'],
        ];

        foreach ($roleStageAssignments as $roleName => $stageNames) {
            $role = Role::where('name', $roleName)->first();
            if ($role) {
                foreach ($stageNames as $stageName) {
                    $stage = ShipmentStage::where('name', $stageName)->first();
                    if ($stage) {
                        $role->shipmentStages()->syncWithoutDetaching([$stage->id]);
                    }
                }
            }
        }

        // Configure visibility rules
        $this->configureVisibilityRules();
    }

    /**
     * Configure visibility rules for different roles and stages.
     */
    private function configureVisibilityRules(): void
    {
        $stages = ShipmentStage::all();
        $roles = Role::all();

        // Define visibility rules
        $visibilityRules = [
            // Admin can see everything
            'admin' => [
                'reference' => true,
                'metadata' => true,
                'current_stage_id' => true,
                'version' => true,
                'created_by' => true,
                'tenant_id' => true,
                'created_at' => true,
                'updated_at' => true,
                'sale.total' => true,
                'sale.subtotal' => true,
                'sale.customer_id' => true,
                'sale.date' => true,
            ],
            // Logistics manager can see most things
            'logistics_manager' => [
                'reference' => true,
                'metadata' => true,
                'current_stage_id' => true,
                'version' => true,
                'created_by' => true,
                'tenant_id' => true,
                'created_at' => true,
                'updated_at' => true,
                'sale.total' => true,
                'sale.subtotal' => true,
                'sale.customer_id' => true,
                'sale.date' => true,
            ],
            // Driver can see limited information
            'driver' => [
                'reference' => true,
                'metadata' => true,
                'current_stage_id' => true,
                'created_by' => false, // Driver doesn't need to see who created it
                'tenant_id' => false,
                'created_at' => true,
                'updated_at' => false,
                'sale.total' => false, // Driver doesn't see prices
                'sale.subtotal' => false,
                'sale.customer_id' => true,
                'sale.date' => true,
            ],
            // Warehouse operator can see preparation info
            'warehouse_operator' => [
                'reference' => true,
                'metadata' => true,
                'current_stage_id' => true,
                'version' => true,
                'created_by' => true,
                'tenant_id' => true,
                'created_at' => true,
                'updated_at' => true,
                'sale.total' => true,
                'sale.subtotal' => true,
                'sale.customer_id' => true,
                'sale.date' => true,
            ],
        ];

        foreach ($stages as $stage) {
            foreach ($roles as $role) {
                if (isset($visibilityRules[$role->name])) {
                    foreach ($visibilityRules[$role->name] as $attribute => $visible) {
                        ShipmentRoleAttributeVisibility::firstOrCreate([
                            'stage_id' => $stage->id,
                            'role_id' => $role->id,
                            'attribute' => $attribute,
                        ], [
                            'visible' => $visible,
                        ]);
                    }
                }
            }
        }
    }

    /**
     * Assign shipment permissions to roles.
     */
    private function assignPermissionsToRoles(): void
    {
        $rolePermissions = [
            'admin' => [
                'ver_envios',
                'mover_envios',
            ],
            'logistics_manager' => [
                'ver_envios',
                'mover_envios',
            ],
            'driver' => [
                'ver_envios',
                'mover_envios',
            ],
            'warehouse_operator' => [
                'ver_envios',
                'mover_envios',
            ],
        ];

        foreach ($rolePermissions as $roleName => $permissions) {
            $role = Role::where('name', $roleName)->first();
            if ($role) {
                foreach ($permissions as $permissionName) {
                    $permission = \App\Models\Permission::where('name', $permissionName)->first();
                    if ($permission) {
                        $role->permissions()->syncWithoutDetaching([$permission->id]);
                    }
                }
            }
        }
    }
}
