<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Category;
use App\Models\Measure;
use App\Models\Iva;
use App\Models\Supplier;
use App\Models\Person;
use App\Models\User;
use App\Models\DocumentType;
use App\Models\PersonType;
use App\Models\FiscalCondition;
use App\Models\Branch;
use App\Models\ProductCostHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Constants\ProductCostHistorySourceTypes;
use Tests\TestCase;

class ProductComprehensivePencilIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_editing_one_product_via_pencil_never_affects_siblings_in_same_category_or_supplier()
    {
        $doc = DocumentType::firstOrCreate(['id' => 1], ['name' => 'DNI', 'is_active' => true]);
        $pt = PersonType::firstOrCreate(['id' => 1], ['name' => 'Fisica', 'is_active' => true]);
        $fc = FiscalCondition::firstOrCreate(['id' => 1], ['name' => 'Consumidor Final', 'is_active' => true]);

        // Asegurarse de que haya al menos una rama para el stock (ProductService lo usa)
        Branch::firstOrCreate(['id' => 1], ['name' => 'Branch 1', 'description' => 'Test', 'address' => 'Test', 'phone' => '123', 'is_active' => true]);

        $person = Person::factory()->create([
            'document_type_id' => $doc->id,
            'person_type_id' => $pt->id,
            'fiscal_condition_id' => $fc->id,
        ]);
        
        $user = User::factory()->create(['person_id' => $person->id]);
        $this->actingAs($user);

        // Crear entidades básicas
        $category = Category::factory()->create();
        
        $supplierPerson = Person::factory()->create([
            'document_type_id' => $doc->id,
            'person_type_id' => $pt->id,
            'fiscal_condition_id' => $fc->id,
        ]);
        $supplier = Supplier::factory()->create(['person_id' => $supplierPerson->id]);

        $measure = Measure::factory()->create();
        $iva = Iva::factory()->create();

        // Crear 10 productos identicos en la misma categoria y proveedor
        $products = Product::factory()->count(10)->create([
            'category_id' => $category->id,
            'supplier_id' => $supplier->id,
            'measure_id' => $measure->id,
            'iva_id' => $iva->id,
            'unit_price' => 1000,
            'markup' => 0.5,
            'sale_price' => 1500,
            'status' => true,
        ]);

        $targetProduct = $products->first();
        $siblingProducts = $products->where('id', '!=', $targetProduct->id);

        // Limpiar el historial
        ProductCostHistory::truncate();

        // Payload enviado del frontend Lápiz
        $payload = [
            'unit_price' => 2000,
            'markup' => 0.3,
            'sale_price' => 2600,
            'target_manual_price' => 2600,
            'is_manual_price' => true,
            'force_manual_price' => true,
            'status' => "1",
            'web' => "1",
            'allow_discount' => "1",
            'category_id' => $category->id,
            'supplier_id' => $supplier->id,
            'measure_id' => $targetProduct->measure_id,
            'iva_id' => $targetProduct->iva_id,
            'description' => $targetProduct->description,
            'code' => (string)$targetProduct->code,
            'currency' => 'ARS',
        ];

        // Disparar
        $this->withoutMiddleware();
        $response = $this->putJson("/api/products/{$targetProduct->id}", $payload);
        $response->assertStatus(200);

        // Verificar target
        $targetProduct->refresh();
        $this->assertEquals(2000, $targetProduct->unit_price);
        $this->assertEquals(0.3, $targetProduct->markup);

        // Verificar historial target
        $this->assertDatabaseHas('product_cost_histories', [
            'product_id' => $targetProduct->id,
            'source_type' => ProductCostHistorySourceTypes::MANUAL,
            'new_cost' => 2000,
        ]);

        // Verificación de aislamiento
        foreach ($siblingProducts as $sibling) {
            $sibling->refresh();
            $this->assertEquals(1000, $sibling->unit_price, "Error: Producto {$sibling->id} afectado!");
            $this->assertDatabaseMissing('product_cost_histories', [
                'product_id' => $sibling->id,
            ]);
        }
        
        $this->assertEquals(1, ProductCostHistory::count(), "Multiples historiales por 1 lápiz!");
    }
}