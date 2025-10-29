<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Interfaces\ComboServiceInterface;
use App\Models\Combo;
use App\Models\Product;
use App\Models\Branch;
use App\Models\Stock;
use App\Models\Iva;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;

class ComboServiceTest extends TestCase
{
    use RefreshDatabase;

    protected ComboServiceInterface $comboService;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Crear datos base para los tests (usar firstOrCreate para evitar unique constraint)
        Iva::firstOrCreate(['rate' => 21.00], ['rate' => 21.00]);
        Branch::firstOrCreate(['id' => 1], ['description' => 'Main Branch']);
        
        // Resolver el servicio desde el container
        $this->comboService = $this->app->make(ComboServiceInterface::class);
    }

    public function test_can_create_combo_with_items(): void
    {
        $product1 = Product::factory()->create(['sale_price' => 100, 'currency' => 'ARS']);
        $product2 = Product::factory()->create(['sale_price' => 50, 'currency' => 'ARS']);

        $data = [
            'name' => 'Test Combo',
            'description' => 'A combo for testing',
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'is_active' => true,
            'items' => [
                ['product_id' => $product1->id, 'quantity' => 2],
                ['product_id' => $product2->id, 'quantity' => 1],
            ],
        ];

        $combo = $this->comboService->create($data);

        $this->assertNotNull($combo);
        $this->assertEquals('Test Combo', $combo->name);
        $this->assertCount(2, $combo->comboItems);
        $this->assertEquals(2, $combo->comboItems->where('product_id', $product1->id)->first()->quantity);
    }

    public function test_can_update_combo_with_new_items(): void
    {
        $product1 = Product::factory()->create(['sale_price' => 100]);
        $product2 = Product::factory()->create(['sale_price' => 50]);
        $product3 = Product::factory()->create(['sale_price' => 200]);

        $combo = Combo::factory()->create();
        $combo->comboItems()->create([
            'product_id' => $product1->id,
            'quantity' => 1
        ]);

        $data = [
            'name' => 'Updated Combo',
            'items' => [
                ['product_id' => $product2->id, 'quantity' => 2],
                ['product_id' => $product3->id, 'quantity' => 1],
            ],
        ];

        $updatedCombo = $this->comboService->update($combo->id, $data);

        $this->assertEquals('Updated Combo', $updatedCombo->name);
        $this->assertCount(2, $updatedCombo->comboItems);
        $this->assertFalse($updatedCombo->comboItems->contains('product_id', $product1->id));
        $this->assertEquals(2, $updatedCombo->comboItems->where('product_id', $product2->id)->first()->quantity);
    }

    public function test_can_delete_combo(): void
    {
        $combo = Combo::factory()->create();
        $deleted = $this->comboService->delete($combo->id);
        
        $this->assertTrue($deleted);
        $this->assertSoftDeleted($combo);
    }

    public function test_calculate_combo_price_percentage_discount(): void
    {
        $iva = Iva::firstOrCreate(['rate' => 21.00], ['rate' => 21.00]);
        $product1 = Product::factory()->create(['sale_price' => 100, 'currency' => 'ARS', 'iva_id' => $iva->id]);
        $product2 = Product::factory()->create(['sale_price' => 50, 'currency' => 'ARS', 'iva_id' => $iva->id]);

        $combo = Combo::factory()->create([
            'discount_type' => 'percentage',
            'discount_value' => 10, // 10% discount
        ]);
        
        $combo->comboItems()->create(['product_id' => $product1->id, 'quantity' => 2]); // 2 * 100 = 200
        $combo->comboItems()->create(['product_id' => $product2->id, 'quantity' => 1]); // 1 * 50 = 50
        // Total base = 250

        $priceDetails = $this->comboService->calculatePrice($combo->id);

        $this->assertEquals(250.00, $priceDetails['total_base']);
        $this->assertEquals(25.00, $priceDetails['total_discount']); // 10% of 250
        $this->assertEquals(225.00, $priceDetails['final_price']); // 250 - 25
        $this->assertEquals('ARS', $priceDetails['currency']);
    }

    public function test_calculate_combo_price_fixed_amount_discount(): void
    {
        $iva = Iva::firstOrCreate(['rate' => 21.00], ['rate' => 21.00]);
        $product1 = Product::factory()->create(['sale_price' => 100, 'currency' => 'ARS', 'iva_id' => $iva->id]);
        $product2 = Product::factory()->create(['sale_price' => 50, 'currency' => 'ARS', 'iva_id' => $iva->id]);

        $combo = Combo::factory()->create([
            'discount_type' => 'fixed_amount',
            'discount_value' => 30, // $30 discount
        ]);
        
        $combo->comboItems()->create(['product_id' => $product1->id, 'quantity' => 2]); // 2 * 100 = 200
        $combo->comboItems()->create(['product_id' => $product2->id, 'quantity' => 1]); // 1 * 50 = 50
        // Total base = 250

        $priceDetails = $this->comboService->calculatePrice($combo->id);

        $this->assertEquals(250.00, $priceDetails['total_base']);
        $this->assertEquals(30.00, $priceDetails['total_discount']);
        $this->assertEquals(220.00, $priceDetails['final_price']); // 250 - 30
        $this->assertEquals('ARS', $priceDetails['currency']);
    }

    public function test_check_combo_availability_sufficient_stock(): void
    {
        $product1 = Product::factory()->create();
        $product2 = Product::factory()->create();
        $branch = Branch::factory()->create();

        Stock::factory()->create(['product_id' => $product1->id, 'branch_id' => $branch->id, 'current_stock' => 10]);
        Stock::factory()->create(['product_id' => $product2->id, 'branch_id' => $branch->id, 'current_stock' => 5]);

        $combo = Combo::factory()->create();
        $combo->comboItems()->create(['product_id' => $product1->id, 'quantity' => 2]); // Needs 2 * 2 = 4
        $combo->comboItems()->create(['product_id' => $product2->id, 'quantity' => 1]); // Needs 1 * 2 = 2

        $availability = $this->comboService->checkAvailability($combo->id, $branch->id, 2); // Request 2 combos

        $this->assertTrue($availability['is_available']);
        $this->assertNull($availability['missing_product']);
        $this->assertEquals(5, $availability['available_quantity']); // Limited by product2 (5/1 = 5)
    }

    public function test_check_combo_availability_insufficient_stock(): void
    {
        $product1 = Product::factory()->create();
        $product2 = Product::factory()->create();
        $branch = Branch::factory()->create();

        Stock::factory()->create(['product_id' => $product1->id, 'branch_id' => $branch->id, 'current_stock' => 3]); // Only enough for 1 combo (3/2=1.5 -> 1)
        Stock::factory()->create(['product_id' => $product2->id, 'branch_id' => $branch->id, 'current_stock' => 5]);

        $combo = Combo::factory()->create();
        $combo->comboItems()->create(['product_id' => $product1->id, 'quantity' => 2]);
        $combo->comboItems()->create(['product_id' => $product2->id, 'quantity' => 1]);

        $availability = $this->comboService->checkAvailability($combo->id, $branch->id, 2); // Request 2 combos

        $this->assertFalse($availability['is_available']);
        $this->assertEquals($product1->description, $availability['missing_product']);
        $this->assertEquals(1, $availability['available_quantity']);
    }

    public function test_validate_combo_data_with_valid_data(): void
    {
        $product = Product::factory()->create();
        
        $data = [
            'name' => 'Valid Combo',
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1]
            ]
        ];

        $errors = $this->comboService->validateComboData($data);
        
        $this->assertEmpty($errors);
    }

    public function test_validate_combo_data_with_invalid_data(): void
    {
        $data = [
            'name' => '', // Empty name
            'discount_type' => 'invalid_type',
            'discount_value' => -5, // Negative value
            'items' => [] // Empty items
        ];

        $errors = $this->comboService->validateComboData($data);
        
        $this->assertNotEmpty($errors);
        $this->assertContains('El nombre del combo es requerido', $errors);
        $this->assertContains('El tipo de descuento debe ser "percentage" o "fixed_amount"', $errors);
        $this->assertContains('El valor de descuento no puede ser negativo', $errors);
        $this->assertContains('El combo debe tener al menos un producto', $errors);
    }

    public function test_get_statistics(): void
    {
        Combo::factory()->count(5)->create(['is_active' => true]);
        Combo::factory()->count(3)->create(['is_active' => false]);

        $statistics = $this->comboService->getStatistics();

        $this->assertEquals(8, $statistics['total_combos']);
        $this->assertEquals(5, $statistics['active_combos']);
        $this->assertEquals(3, $statistics['inactive_combos']);
    }

    public function test_deduct_combo_stock(): void
    {
        $product1 = Product::factory()->create();
        $product2 = Product::factory()->create();
        $branch = Branch::factory()->create();

        Stock::factory()->create(['product_id' => $product1->id, 'branch_id' => $branch->id, 'current_stock' => 10]);
        Stock::factory()->create(['product_id' => $product2->id, 'branch_id' => $branch->id, 'current_stock' => 5]);

        $combo = Combo::factory()->create();
        $combo->comboItems()->create(['product_id' => $product1->id, 'quantity' => 2]);
        $combo->comboItems()->create(['product_id' => $product2->id, 'quantity' => 1]);

        $this->comboService->deductComboStock($combo->id, $branch->id, 2);

        $stock1 = Stock::where('product_id', $product1->id)->where('branch_id', $branch->id)->first();
        $stock2 = Stock::where('product_id', $product2->id)->where('branch_id', $branch->id)->first();

        $this->assertEquals(6, $stock1->current_stock); // 10 - (2 * 2) = 6
        $this->assertEquals(3, $stock2->current_stock); // 5 - (1 * 2) = 3
    }

    public function test_restore_combo_stock(): void
    {
        $product1 = Product::factory()->create();
        $product2 = Product::factory()->create();
        $branch = Branch::factory()->create();

        Stock::factory()->create(['product_id' => $product1->id, 'branch_id' => $branch->id, 'current_stock' => 6]);
        Stock::factory()->create(['product_id' => $product2->id, 'branch_id' => $branch->id, 'current_stock' => 3]);

        $combo = Combo::factory()->create();
        $combo->comboItems()->create(['product_id' => $product1->id, 'quantity' => 2]);
        $combo->comboItems()->create(['product_id' => $product2->id, 'quantity' => 1]);

        $this->comboService->restoreComboStock($combo->id, $branch->id, 2);

        $stock1 = Stock::where('product_id', $product1->id)->where('branch_id', $branch->id)->first();
        $stock2 = Stock::where('product_id', $product2->id)->where('branch_id', $branch->id)->first();

        $this->assertEquals(10, $stock1->current_stock); // 6 + (2 * 2) = 10
        $this->assertEquals(5, $stock2->current_stock); // 3 + (1 * 2) = 5
    }
}