<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckAccessSchedule;
use App\Http\Middleware\CheckPermission;
use App\Models\Category;
use App\Models\Iva;
use App\Models\Measure;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProductSingleUpdateIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Required reference data for Person/User factories.
        DB::table('document_types')->insert([
            'id' => 1,
            'name' => 'DNI',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('person_types')->insert([
            'id' => 1,
            'name' => 'Person',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('fiscal_conditions')->insert([
            'id' => 1,
            'name' => 'Consumidor Final',
            'afip_code' => '5',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $this->withoutMiddleware([
            CheckPermission::class,
            CheckAccessSchedule::class,
        ]);
    }

    /** @test */
    public function it_updates_only_the_target_product_when_editing_with_pencil_flow(): void
    {
        $category = Category::factory()->create();
        $measure = Measure::factory()->create();
        $iva = Iva::factory()->create(['rate' => 21.00]);
        $supplier = Supplier::factory()->create();

        $target = Product::factory()->create([
            'code' => '50010',
            'unit_price' => 3000,
            'markup' => 0.20,
            'category_id' => $category->id,
            'measure_id' => $measure->id,
            'iva_id' => $iva->id,
            'supplier_id' => $supplier->id,
            'status' => true,
            'web' => true,
        ]);

        $other = Product::factory()->create([
            'code' => '7791432889068',
            'unit_price' => 1234,
            'markup' => 0.20,
            'category_id' => $category->id,
            'measure_id' => $measure->id,
            'iva_id' => $iva->id,
            'supplier_id' => $supplier->id,
            'status' => true,
            'web' => true,
        ]);

        $this->putJson("/api/products/{$target->id}", [
            'unit_price' => 4000,
        ])->assertOk();

        $target->refresh();
        $other->refresh();

        $this->assertEquals(4000.00, (float) $target->unit_price);
        $this->assertEquals(1234.00, (float) $other->unit_price);
    }
}
