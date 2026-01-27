<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\PurchaseOrder;
use App\Models\Branch;
use App\Models\Supplier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseOrderPaginationTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $branch;
    protected $supplier;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed necessary data
        $this->user = User::factory()->create();
        $this->branch = Branch::factory()->create();
        $this->supplier = Supplier::factory()->create();
    }

    public function test_purchase_orders_pagination_per_page()
    {
        // Create 20 purchase orders
        PurchaseOrder::factory()->count(20)->create([
            'branch_id' => $this->branch->id,
            'supplier_id' => $this->supplier->id,
            'status' => 'pending'
        ]);

        $this->actingAs($this->user);

        // Test default (15)
        $response = $this->getJson('/api/purchase-orders');
        $response->assertStatus(200);
        $response->assertJsonCount(15, 'data');

        // Test custom per_page (10)
        $response10 = $this->getJson('/api/purchase-orders?per_page=10');
        $response10->assertStatus(200);
        $response10->assertJsonCount(10, 'data');

        // Test custom per_page (20)
        $response20 = $this->getJson('/api/purchase-orders?per_page=20');
        $response20->assertStatus(200);
        $response20->assertJsonCount(20, 'data');
    }
}
