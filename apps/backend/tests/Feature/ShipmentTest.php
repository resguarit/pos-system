<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\ShipmentStage;
use App\Models\Shipment;
use App\Models\SaleHeader;
use App\Models\Branch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShipmentTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Role $role;
    protected ShipmentStage $initialStage;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test role with permissions
        $this->role = Role::create([
            'name' => 'test_role',
            'description' => 'Test Role',
            'active' => true,
        ]);

        $permissions = [
            'shipment.view',
            'shipment.move',
            'shipment.configure',
        ];

        foreach ($permissions as $permissionName) {
            $permission = Permission::firstOrCreate([
                'name' => $permissionName,
                'description' => ucfirst(str_replace('.', ' ', $permissionName)),
                'module' => 'shipments',
            ]);
            $this->role->permissions()->attach($permission);
        }

        // Create test user (factory will create Person automatically)
        $person = \App\Models\Person::factory()->create();
        $this->user = User::create([
            'person_id' => $person->id,
            'email' => 'test@example.com',
            'username' => 'testuser',
            'password' => bcrypt('password'),
            'active' => true,
            'role_id' => $this->role->id,
        ]);

        // Create initial stage
        $this->initialStage = ShipmentStage::create([
            'name' => 'Preparación',
            'description' => 'Envío en preparación',
            'order' => 1,
            'config' => ['color' => '#fbbf24'],
            'active' => true,
        ]);

        $this->role->shipmentStages()->attach($this->initialStage);
    }

    public function test_can_create_shipment()
    {
        $sale = SaleHeader::create([
            'date' => now(),
            'receipt_type_id' => 1,
            'branch_id' => 1,
            'receipt_number' => 'V-001',
            'numbering_scope' => 'sale',
            'subtotal' => 1000,
            'total' => 1210,
            'user_id' => $this->user->id,
            'status' => 'completed',
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/shipments', [
                'reference' => 'SH-TEST-001',
                'sale_ids' => [$sale->id],
                'metadata' => ['priority' => 'high'],
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'reference',
                    'metadata',
                    'current_stage_id',
                    'version',
                    'created_by',
                ]
            ]);

        $this->assertDatabaseHas('shipments', [
            'reference' => 'SH-TEST-001',
            'created_by' => $this->user->id,
        ]);
    }

    public function test_can_get_shipments()
    {
        $shipment = Shipment::create([
            'reference' => 'SH-TEST-002',
            'metadata' => [],
            'current_stage_id' => $this->initialStage->id,
            'created_by' => $this->user->id,
            'tenant_id' => 1,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/shipments');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data' => [
                        '*' => [
                            'id',
                            'reference',
                            'current_stage_id',
                        ]
                    ]
                ]
            ]);
    }

    public function test_can_move_shipment()
    {
        $shipment = Shipment::create([
            'reference' => 'SH-TEST-003',
            'metadata' => [],
            'current_stage_id' => $this->initialStage->id,
            'created_by' => $this->user->id,
            'tenant_id' => 1,
        ]);

        $newStage = ShipmentStage::create([
            'name' => 'En Ruta',
            'description' => 'Envío en camino',
            'order' => 2,
            'config' => ['color' => '#3b82f6'],
            'active' => true,
        ]);

        $this->role->shipmentStages()->attach($newStage);

        $response = $this->actingAs($this->user)
            ->patchJson("/api/shipments/{$shipment->id}/move", [
                'stage_id' => $newStage->id,
                'version' => $shipment->version,
                'metadata' => ['reason' => 'test move'],
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('shipments', [
            'id' => $shipment->id,
            'current_stage_id' => $newStage->id,
            'version' => $shipment->version + 1,
        ]);

        $this->assertDatabaseHas('shipment_events', [
            'shipment_id' => $shipment->id,
            'from_stage_id' => $this->initialStage->id,
            'to_stage_id' => $newStage->id,
        ]);
    }

    public function test_can_get_shipment_stages()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/shipment-stages');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'description',
                        'order',
                        'config',
                        'active',
                    ]
                ]
            ]);
    }

    public function test_can_create_shipment_stage()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/shipment-stages', [
                'name' => 'Entregado',
                'description' => 'Envío entregado',
                'order' => 3,
                'config' => ['color' => '#10b981'],
                'active' => true,
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('shipment_stages', [
            'name' => 'Entregado',
            'order' => 3,
        ]);
    }

    public function test_idempotency_key_prevents_duplicate_creation()
    {
        $sale = SaleHeader::create([
            'date' => now(),
            'receipt_type_id' => 1,
            'branch_id' => 1,
            'receipt_number' => 'V-002',
            'numbering_scope' => 'sale',
            'subtotal' => 1000,
            'total' => 1210,
            'user_id' => $this->user->id,
            'status' => 'completed',
        ]);

        $idempotencyKey = 'test-key-' . time();

        // First request
        $response1 = $this->actingAs($this->user)
            ->withHeaders(['Idempotency-Key' => $idempotencyKey])
            ->postJson('/api/shipments', [
                'reference' => 'SH-IDEMPOTENT-001',
                'sale_ids' => [$sale->id],
            ]);

        $response1->assertStatus(201);
        $shipmentId = $response1->json('data.id');

        // Second request with same key should return same shipment
        $response2 = $this->actingAs($this->user)
            ->withHeaders(['Idempotency-Key' => $idempotencyKey])
            ->postJson('/api/shipments', [
                'reference' => 'SH-IDEMPOTENT-001',
                'sale_ids' => [$sale->id],
            ]);

        $response2->assertStatus(201)
            ->assertJsonPath('data.id', $shipmentId);

        // Should only have one shipment in database
        $this->assertEquals(1, Shipment::where('reference', 'SH-IDEMPOTENT-001')->count());
    }

    public function test_optimistic_locking_prevents_conflicts()
    {
        $shipment = Shipment::create([
            'reference' => 'SH-CONFLICT-001',
            'metadata' => [],
            'current_stage_id' => $this->initialStage->id,
            'created_by' => $this->user->id,
            'tenant_id' => 1,
        ]);

        $newStage = ShipmentStage::create([
            'name' => 'En Ruta',
            'description' => 'Envío en camino',
            'order' => 2,
            'config' => ['color' => '#3b82f6'],
            'active' => true,
        ]);

        $this->role->shipmentStages()->attach($newStage);

        // Simulate concurrent modification by updating version
        $shipment->increment('version');

        $response = $this->actingAs($this->user)
            ->patchJson("/api/shipments/{$shipment->id}/move", [
                'stage_id' => $newStage->id,
                'version' => $shipment->version - 1, // Old version
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('error.code', 'CONFLICT');
    }
}