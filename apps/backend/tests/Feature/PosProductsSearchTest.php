<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckAccessSchedule;
use App\Http\Middleware\CheckPermission;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosProductsSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        // El objetivo de este test es validar la búsqueda en sí,
        // no la matriz de permisos/horarios.
        $this->withoutMiddleware([
            CheckPermission::class,
            CheckAccessSchedule::class,
        ]);
    }

    public function test_returns_empty_array_when_query_is_missing(): void
    {
        $response = $this->getJson('/api/pos/products');

        $response->assertStatus(200)
            ->assertExactJson([]);
    }

    public function test_prioritizes_exact_code_match_and_respects_limit(): void
    {
        $exact = Product::factory()->create([
            'code' => '7891000244012',
            'description' => 'Pouch Cat Chow Gallitos',
            'status' => true,
        ]);

        Product::factory()->create([
            'code' => '999999',
            'description' => 'Producto relacionado 7891000244012',
            'status' => true,
        ]);

        Product::factory()->create([
            'code' => '7891000244012-INACTIVO',
            'description' => 'No debería aparecer',
            'status' => false,
        ]);

        $response = $this->getJson('/api/pos/products?query=7891000244012&limit=1');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $exact->id)
            ->assertJsonPath('0.code', '7891000244012');
    }
}
