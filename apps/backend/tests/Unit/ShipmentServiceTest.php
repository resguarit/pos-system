<?php

namespace Tests\Unit;

use App\Models\Shipment;
use App\Models\ShipmentStage;
use App\Models\User;
use App\Models\SaleHeader;
use App\Services\ShipmentService;
use App\Interfaces\ShipmentServiceInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShipmentServiceTest extends TestCase
{
    use RefreshDatabase;

    protected ShipmentServiceInterface $shipmentService;
    protected User $user;
    protected ShipmentStage $initialStage;

    protected function setUp(): void
    {
        parent::setUp();

        $this->shipmentService = app(ShipmentServiceInterface::class);

        // Create Person first, then User
        $person = \App\Models\Person::factory()->create();
        $this->user = User::create([
            'person_id' => $person->id,
            'email' => 'test@example.com',
            'username' => 'testuser',
            'password' => bcrypt('password'),
            'active' => true,
        ]);

        $this->initialStage = ShipmentStage::create([
            'name' => 'Preparación',
            'description' => 'Envío en preparación',
            'order' => 1,
            'config' => ['color' => '#fbbf24'],
            'active' => true,
        ]);
    }

    public function test_can_create_shipment()
    {
        $sale = SaleHeader::create([
            'date' => now(),
            'receipt_type_id' => 1,
            'branch_id' => 1,
            'receipt_number' => 'V-001',
            'subtotal' => 1000,
            'total' => 1210,
            'user_id' => $this->user->id,
            'status' => 'completed',
        ]);

        $shipment = $this->shipmentService->create([
            'reference' => 'SH-SERVICE-001',
            'sale_ids' => [$sale->id],
            'metadata' => ['priority' => 'high'],
        ], $this->user);

        $this->assertInstanceOf(Shipment::class, $shipment);
        $this->assertEquals('SH-SERVICE-001', $shipment->reference);
        $this->assertEquals($this->initialStage->id, $shipment->current_stage_id);
        $this->assertEquals($this->user->id, $shipment->created_by);
        $this->assertCount(1, $shipment->sales);
    }

    public function test_can_move_shipment()
    {
        $shipment = Shipment::create([
            'reference' => 'SH-SERVICE-002',
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

        $movedShipment = $this->shipmentService->moveShipment(
            $shipment->id,
            $newStage->id,
            $this->user,
            ['reason' => 'test move']
        );

        $this->assertEquals($newStage->id, $movedShipment->current_stage_id);
        $this->assertGreaterThan($shipment->version, $movedShipment->version);
        $this->assertDatabaseHas('shipment_events', [
            'shipment_id' => $shipment->id,
            'from_stage_id' => $this->initialStage->id,
            'to_stage_id' => $newStage->id,
        ]);
    }

    public function test_shipment_model_can_move_to_stage()
    {
        $shipment = Shipment::create([
            'reference' => 'SH-MODEL-001',
            'metadata' => [],
            'current_stage_id' => $this->initialStage->id,
            'created_by' => $this->user->id,
            'tenant_id' => 1,
        ]);

        $newStage = ShipmentStage::create([
            'name' => 'Entregado',
            'description' => 'Envío entregado',
            'order' => 3,
            'config' => ['color' => '#10b981'],
            'active' => true,
        ]);

        $this->assertTrue($shipment->canMoveTo($newStage));
        $this->assertFalse($shipment->canMoveTo($this->initialStage)); // Same stage
    }

    public function test_shipment_model_increments_version()
    {
        $shipment = Shipment::create([
            'reference' => 'SH-VERSION-001',
            'metadata' => [],
            'current_stage_id' => $this->initialStage->id,
            'created_by' => $this->user->id,
            'tenant_id' => 1,
            'version' => 1,
        ]);

        $originalVersion = $shipment->version;
        $shipment->incrementVersion();

        $this->assertEquals($originalVersion + 1, $shipment->version);
    }

    public function test_shipment_stage_model_relationships()
    {
        $stage = ShipmentStage::create([
            'name' => 'Test Stage',
            'description' => 'Test Description',
            'order' => 1,
            'config' => ['color' => '#ff0000'],
            'active' => true,
        ]);

        $shipment = Shipment::create([
            'reference' => 'SH-RELATION-001',
            'metadata' => [],
            'current_stage_id' => $stage->id,
            'created_by' => $this->user->id,
            'tenant_id' => 1,
        ]);

        $this->assertCount(1, $stage->shipments);
        $this->assertEquals($shipment->id, $stage->shipments->first()->id);
    }
}
