<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckAccessSchedule;
use App\Http\Middleware\CheckPermission;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CashRegisterPaymentMethodsOptimizedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $this->withoutMiddleware([
            CheckPermission::class,
            CheckAccessSchedule::class,
        ]);
    }

    public function test_categorizes_cash_methods_by_affects_cash_and_keyword_fallback(): void
    {
        PaymentMethod::create([
            'name' => 'Caja 20',
            'description' => 'Método efectivo sin keyword',
            'is_active' => true,
            'affects_cash' => true,
            'discount_percentage' => 20,
        ]);

        PaymentMethod::create([
            'name' => 'Efectivo 10',
            'description' => 'Método con keyword efectivo',
            'is_active' => true,
            'affects_cash' => false,
            'discount_percentage' => 10,
        ]);

        PaymentMethod::create([
            'name' => 'Tarjeta crédito',
            'description' => 'No efectivo',
            'is_active' => true,
            'affects_cash' => false,
            'discount_percentage' => 0,
        ]);

        $response = $this->getJson('/api/cash-registers/payment-methods-optimized');

        $response->assertStatus(200);

        $cashNames = collect($response->json('data.categorized.cash'))->pluck('name')->all();
        $otherNames = collect($response->json('data.categorized.other'))->pluck('name')->all();
        $cardNames = collect($response->json('data.categorized.card'))->pluck('name')->all();

        $this->assertContains('Caja 20', $cashNames);
        $this->assertContains('Efectivo 10', $cashNames);
        $this->assertNotContains('Tarjeta crédito', $cashNames);
        $this->assertContains('Tarjeta crédito', $cardNames);
        $this->assertNotContains('Tarjeta crédito', $otherNames);
    }
}
