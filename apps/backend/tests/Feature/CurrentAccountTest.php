<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\CurrentAccount;
use App\Models\CurrentAccountMovement;
use App\Models\Customer;
use App\Models\MovementType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CurrentAccountTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Crear datos de prueba necesarios
        $this->customer = Customer::factory()->create();
        $this->user = User::factory()->create();
        $this->movementType = MovementType::factory()->create([
            'is_current_account_movement' => true,
            'operation_type' => 'entrada'
        ]);
    }

    /** @test */
    public function can_create_current_account()
    {
        $data = [
            'customer_id' => $this->customer->id,
            'credit_limit' => 10000.00,
            'notes' => 'Cuenta de prueba'
        ];

        $response = $this->postJson('/api/current-accounts', $data);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'status',
                    'success',
                    'message',
                    'data' => [
                        'id',
                        'customer_id',
                        'credit_limit',
                        'current_balance',
                        'status'
                    ]
                ]);

        $this->assertDatabaseHas('current_accounts', [
            'customer_id' => $this->customer->id,
            'credit_limit' => 10000.00
        ]);
    }

    /** @test */
    public function can_get_current_accounts_list()
    {
        CurrentAccount::factory()->count(3)->create();

        $response = $this->getJson('/api/current-accounts');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'customer_id',
                            'credit_limit',
                            'current_balance',
                            'status'
                        ]
                    ]
                ]);
    }

    /** @test */
    public function can_get_current_account_by_id()
    {
        $account = CurrentAccount::factory()->create();

        $response = $this->getJson("/api/current-accounts/{$account->id}");

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'status',
                    'success',
                    'message',
                    'data' => [
                        'id',
                        'customer_id',
                        'credit_limit',
                        'current_balance',
                        'status'
                    ]
                ]);
    }

    /** @test */
    public function can_suspend_current_account()
    {
        $account = CurrentAccount::factory()->create(['status' => 'active']);

        $response = $this->patchJson("/api/current-accounts/{$account->id}/suspend", [
            'reason' => 'Suspensión de prueba'
        ]);

        $response->assertStatus(200);
        
        $this->assertDatabaseHas('current_accounts', [
            'id' => $account->id,
            'status' => 'suspended'
        ]);
    }

    /** @test */
    public function can_process_payment()
    {
        $account = CurrentAccount::factory()->create([
            'current_balance' => -500.00
        ]);

        $data = [
            'amount' => 200.00,
            'description' => 'Pago de prueba',
            'movement_type_id' => $this->movementType->id
        ];

        $response = $this->postJson("/api/current-accounts/{$account->id}/payments", $data);

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'status',
                    'success',
                    'message',
                    'data' => [
                        'id',
                        'amount',
                        'description',
                        'balance_after'
                    ]
                ]);

        // Verificar que el balance se actualizó
        $account->refresh();
        $this->assertEquals(-300.00, $account->current_balance);
    }

    /** @test */
    public function can_get_account_statistics()
    {
        $account = CurrentAccount::factory()->create();

        $response = $this->getJson("/api/current-accounts/{$account->id}/statistics");

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'status',
                    'success',
                    'message',
                    'data' => [
                        'account_id',
                        'current_balance',
                        'credit_limit',
                        'available_credit',
                        'status'
                    ]
                ]);
    }

    /** @test */
    public function can_get_general_statistics()
    {
        CurrentAccount::factory()->count(5)->create();

        $response = $this->getJson('/api/current-accounts/statistics/general');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'status',
                    'success',
                    'message',
                    'data' => [
                        'total_accounts',
                        'active_accounts',
                        'total_credit_limit',
                        'total_current_balance'
                    ]
                ]);
    }
}

