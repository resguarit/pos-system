<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosProductsWildcardSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\ProductionSeeder::class);

        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        // Ignorar middlewares de permisos y horarios para este test
        $this->withoutMiddleware([
            \App\Http\Middleware\CheckPermission::class,
            \App\Http\Middleware\CheckAccessSchedule::class,
        ]);
    }

    public function test_can_search_with_wildcard_percent(): void
    {
        // Creamos el producto que el usuario reportó
        Product::factory()->create([
            'description' => 'TRAQUEA GRANDE X UNID',
            'status' => true,
        ]);

        // Intentamos buscarlo usando el comodín %
        // Nota: Guzzle/Laravel test helpers manejarán el encoding de la URL
        $response = $this->getJson('/api/pos/products?query=TRAQUEA%UNI');

        // Debería encontrar el producto si el % funciona como comodín
        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.description', 'TRAQUEA GRANDE X UNID');
    }

    public function test_can_search_with_multiple_wildcards(): void
    {
        Product::factory()->create([
            'description' => 'COCA COLA LIGHT 1.5L',
            'status' => true,
        ]);

        // Buscar con múltiples comodines
        $response = $this->getJson('/api/pos/products?query=COCA%LIGHT%1.5');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.description', 'COCA COLA LIGHT 1.5L');
    }
}
