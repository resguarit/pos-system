<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckAccessSchedule;
use App\Http\Middleware\CheckPermission;
use App\Models\Branch;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\CurrentAccountMovement;
use App\Models\Customer;
use App\Models\PaymentMethod;
use App\Models\Repair;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RepairIvaFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        DB::table('document_types')->insert([
            'id' => 1,
            'name' => 'DNI',
            'code' => 'DNI',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('person_types')->insert([
            'id' => 1,
            'name' => 'Persona',
            'description' => 'Persona física',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('fiscal_conditions')->insert([
            'id' => 1,
            'name' => 'Consumidor final',
            'description' => 'Consumidor final',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->user = User::factory()->create();
        $this->actingAs($this->user, 'sanctum');

        $this->withoutMiddleware([
            CheckPermission::class,
            CheckAccessSchedule::class,
        ]);
    }

    public function test_store_repair_calculates_gross_from_net_and_iva(): void
    {
        $branch = Branch::factory()->create();
        $customer = Customer::factory()->create();

        $response = $this->postJson('/api/repairs', [
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'iPhone 14',
            'issue_description' => 'No enciende',
            'priority' => 'Media',
            'status' => 'Recibido',
            'sale_price_without_iva' => 1000,
            'iva_percentage' => 21,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.sale_price_without_iva', '1000.00')
            ->assertJsonPath('data.iva_percentage', '21.00')
            ->assertJsonPath('data.sale_price_with_iva', '1210.00')
            ->assertJsonPath('data.sale_price', '1210.00');

        $this->assertDatabaseHas('repairs', [
            'id' => $response->json('data.id'),
            'sale_price_without_iva' => 1000.00,
            'iva_percentage' => 21.00,
            'sale_price_with_iva' => 1210.00,
            'sale_price' => 1210.00,
        ]);
    }

    public function test_store_repair_with_legacy_sale_price_populates_net_and_gross(): void
    {
        $branch = Branch::factory()->create();
        $customer = Customer::factory()->create();

        $response = $this->postJson('/api/repairs', [
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'Samsung A54',
            'issue_description' => 'Pantalla rota',
            'priority' => 'Alta',
            'status' => 'Recibido',
            'sale_price' => 1210,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.sale_price_without_iva', '1000.00')
            ->assertJsonPath('data.sale_price_with_iva', '1210.00')
            ->assertJsonPath('data.sale_price', '1210.00');
    }

    public function test_mark_as_paid_with_iva_registers_gross_in_cash_movement(): void
    {
        $branch = Branch::factory()->create();
        $customer = Customer::factory()->create();
        $paymentMethod = PaymentMethod::create(['name' => 'Efectivo']);

        $cashRegister = CashRegister::create([
            'user_id' => $this->user->id,
            'branch_id' => $branch->id,
            'initial_amount' => 0,
            'opened_at' => now(),
            'status' => 'open',
        ]);

        $repair = Repair::create([
            'code' => 'REP900',
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'Moto G84',
            'issue_description' => 'Cambio de módulo',
            'priority' => 'Media',
            'status' => 'Terminado',
            'intake_date' => now()->toDateString(),
            'sale_price_without_iva' => 1000,
            'iva_percentage' => 21,
            'sale_price_with_iva' => 1210,
            'sale_price' => 1210,
        ]);

        $response = $this->postJson("/api/repairs/{$repair->id}/mark-as-paid", [
            'branch_id' => $branch->id,
            'payment_method_id' => $paymentMethod->id,
            'charge_with_iva' => true,
        ]);

        $response->assertStatus(200);

        $repair->refresh();
        $this->assertTrue((bool) $repair->is_paid);
        $this->assertEquals(1210.0, (float) $repair->amount_paid);
        $this->assertTrue((bool) $repair->charge_with_iva);

        $cashMovement = CashMovement::findOrFail($repair->cash_movement_id);
        $this->assertEquals($cashRegister->id, $cashMovement->cash_register_id);
        $this->assertEquals(1210.0, (float) $cashMovement->amount);
    }

    public function test_mark_as_paid_without_iva_registers_net_in_cash_movement(): void
    {
        $branch = Branch::factory()->create();
        $customer = Customer::factory()->create();
        $paymentMethod = PaymentMethod::create(['name' => 'Transferencia']);

        CashRegister::create([
            'user_id' => $this->user->id,
            'branch_id' => $branch->id,
            'initial_amount' => 0,
            'opened_at' => now(),
            'status' => 'open',
        ]);

        $repair = Repair::create([
            'code' => 'REP901',
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'Xiaomi Redmi',
            'issue_description' => 'Cambio de batería',
            'priority' => 'Media',
            'status' => 'Terminado',
            'intake_date' => now()->toDateString(),
            'sale_price_without_iva' => 1000,
            'iva_percentage' => 21,
            'sale_price_with_iva' => 1210,
            'sale_price' => 1210,
        ]);

        $response = $this->postJson("/api/repairs/{$repair->id}/mark-as-paid", [
            'branch_id' => $branch->id,
            'payment_method_id' => $paymentMethod->id,
            'charge_with_iva' => false,
        ]);

        $response->assertStatus(200);

        $repair->refresh();
        $this->assertTrue((bool) $repair->is_paid);
        $this->assertEquals(1000.0, (float) $repair->amount_paid);
        $this->assertFalse((bool) $repair->charge_with_iva);

        $cashMovement = CashMovement::findOrFail($repair->cash_movement_id);
        $this->assertEquals(1000.0, (float) $cashMovement->amount);
    }

    public function test_mark_as_paid_without_cash_when_price_is_zero(): void
    {
        $branch = Branch::factory()->create();
        $customer = Customer::factory()->create();
        PaymentMethod::create(['name' => 'Sin cargo']);

        $repair = Repair::create([
            'code' => 'REP902',
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'Tablet',
            'issue_description' => 'Diagnóstico sin reparación',
            'priority' => 'Baja',
            'status' => 'Terminado',
            'intake_date' => now()->toDateString(),
            'sale_price_without_iva' => 0,
            'iva_percentage' => 21,
            'sale_price_with_iva' => 0,
            'sale_price' => 0,
        ]);

        $response = $this->postJson("/api/repairs/{$repair->id}/mark-as-paid", []);

        $response->assertStatus(200);

        $repair->refresh();
        $this->assertTrue((bool) $repair->is_paid);
        $this->assertEquals(0.0, (float) $repair->amount_paid);
        $this->assertNull($repair->cash_movement_id);
    }

    public function test_mark_as_unpaid_reverts_cash_impact_and_allows_recharge(): void
    {
        $branch = Branch::factory()->create();
        $customer = Customer::factory()->create();
        $cashPaymentMethod = PaymentMethod::create(['name' => 'Efectivo']);
        $transferPaymentMethod = PaymentMethod::create(['name' => 'Transferencia']);

        CashRegister::create([
            'user_id' => $this->user->id,
            'branch_id' => $branch->id,
            'initial_amount' => 0,
            'opened_at' => now(),
            'status' => 'open',
        ]);

        $repair = Repair::create([
            'code' => 'REP903',
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'iPhone 13',
            'issue_description' => 'Cambio de módulo',
            'priority' => 'Media',
            'status' => 'Terminado',
            'intake_date' => now()->toDateString(),
            'sale_price_without_iva' => 1000,
            'iva_percentage' => 21,
            'sale_price_with_iva' => 1210,
            'sale_price' => 1210,
        ]);

        $payResponse = $this->postJson("/api/repairs/{$repair->id}/mark-as-paid", [
            'branch_id' => $branch->id,
            'payment_method_id' => $cashPaymentMethod->id,
            'charge_with_iva' => true,
        ]);

        $payResponse->assertStatus(200);

        $repair->refresh();
        $firstCashMovementId = $repair->cash_movement_id;
        $this->assertNotNull($firstCashMovementId);

        $unpayResponse = $this->postJson("/api/repairs/{$repair->id}/mark-as-unpaid");
        $unpayResponse->assertStatus(200);

        $repair->refresh();
        $this->assertFalse((bool) $repair->is_paid);
        $this->assertNull($repair->amount_paid);
        $this->assertNull($repair->payment_method_id);
        $this->assertNull($repair->paid_at);
        $this->assertNull($repair->cash_movement_id);

        $firstMovement = CashMovement::findOrFail($firstCashMovementId);
        $this->assertFalse((bool) $firstMovement->affects_balance);
        $this->assertStringContainsString('[REVERTIDO COBRO REPARACION]', (string) $firstMovement->description);

        $rechargeResponse = $this->postJson("/api/repairs/{$repair->id}/mark-as-paid", [
            'branch_id' => $branch->id,
            'payment_method_id' => $transferPaymentMethod->id,
            'charge_with_iva' => false,
        ]);

        $rechargeResponse->assertStatus(200);

        $repair->refresh();
        $this->assertTrue((bool) $repair->is_paid);
        $this->assertEquals(1000.0, (float) $repair->amount_paid);
        $this->assertNotNull($repair->cash_movement_id);
        $this->assertNotEquals($firstCashMovementId, $repair->cash_movement_id);
    }

    public function test_mark_as_unpaid_requires_existing_payment(): void
    {
        $branch = Branch::factory()->create();
        $customer = Customer::factory()->create();

        $repair = Repair::create([
            'code' => 'REP904',
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'Notebook',
            'issue_description' => 'No enciende',
            'priority' => 'Media',
            'status' => 'Terminado',
            'intake_date' => now()->toDateString(),
            'sale_price_without_iva' => 1000,
            'iva_percentage' => 21,
            'sale_price_with_iva' => 1210,
            'sale_price' => 1210,
            'is_paid' => false,
        ]);

        $response = $this->postJson("/api/repairs/{$repair->id}/mark-as-unpaid");

        $response
            ->assertStatus(422)
            ->assertJsonPath('error', 'La reparación no tiene un cobro registrado');
    }

    public function test_mark_as_paid_supports_partial_multi_method_payments(): void
    {
        $branch = Branch::factory()->create();
        $customer = Customer::factory()->create();
        $cashMethod = PaymentMethod::create([
            'name' => 'Efectivo',
            'is_active' => true,
            'affects_cash' => true,
            'is_customer_credit' => false,
        ]);
        $transferMethod = PaymentMethod::create([
            'name' => 'Transferencia',
            'is_active' => true,
            'affects_cash' => true,
            'is_customer_credit' => false,
        ]);

        CashRegister::create([
            'user_id' => $this->user->id,
            'branch_id' => $branch->id,
            'initial_amount' => 0,
            'opened_at' => now(),
            'status' => 'open',
        ]);

        $repair = Repair::create([
            'code' => 'REP950',
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'Moto G54',
            'issue_description' => 'Cambio de pantalla',
            'priority' => 'Media',
            'status' => 'Terminado',
            'intake_date' => now()->toDateString(),
            'sale_price_without_iva' => 1000,
            'iva_percentage' => 21,
            'sale_price_with_iva' => 1210,
            'sale_price' => 1210,
        ]);

        $response = $this->postJson("/api/repairs/{$repair->id}/mark-as-paid", [
            'branch_id' => $branch->id,
            'charge_with_iva' => true,
            'payments' => [
                ['payment_method_id' => $cashMethod->id, 'amount' => 200],
                ['payment_method_id' => $transferMethod->id, 'amount' => 300],
            ],
        ]);

        $response->assertStatus(200);

        $repair->refresh();
        $this->assertFalse((bool) $repair->is_paid);
        $this->assertEquals('partial', $repair->payment_status);
        $this->assertEquals(500.0, (float) $repair->total_paid);
        $this->assertEquals(500.0, (float) $repair->amount_paid);

        $this->assertDatabaseCount('repair_payments', 2);

        $chargeMovement = CurrentAccountMovement::query()
            ->whereJsonContains('metadata->kind', 'repair_charge')
            ->whereJsonContains('metadata->repair_id', $repair->id)
            ->first();
        $this->assertNotNull($chargeMovement);

        $paymentMovementsCount = CurrentAccountMovement::query()
            ->whereJsonContains('metadata->kind', 'repair_payment')
            ->whereJsonContains('metadata->repair_id', $repair->id)
            ->count();
        $this->assertEquals(2, $paymentMovementsCount);
    }

    public function test_mark_as_paid_rejects_current_account_method(): void
    {
        $branch = Branch::factory()->create();
        $customer = Customer::factory()->create();
        $currentAccountMethod = PaymentMethod::create([
            'name' => 'Cuenta Corriente',
            'is_active' => true,
            'affects_cash' => false,
            'is_customer_credit' => true,
        ]);

        $repair = Repair::create([
            'code' => 'REP951',
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'Notebook',
            'issue_description' => 'Cambio de teclado',
            'priority' => 'Media',
            'status' => 'Terminado',
            'intake_date' => now()->toDateString(),
            'sale_price_without_iva' => 1000,
            'iva_percentage' => 21,
            'sale_price_with_iva' => 1210,
            'sale_price' => 1210,
        ]);

        $response = $this->postJson("/api/repairs/{$repair->id}/mark-as-paid", [
            'payment_method_id' => $currentAccountMethod->id,
            'amount_paid' => 100,
            'charge_with_iva' => true,
            'branch_id' => $branch->id,
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('error', 'Cuenta Corriente no se puede usar como método de cobro en reparaciones.');
    }

    public function test_mark_as_unpaid_can_revert_specific_payment(): void
    {
        $branch = Branch::factory()->create();
        $customer = Customer::factory()->create();
        $cashMethod = PaymentMethod::create(['name' => 'Efectivo']);
        $transferMethod = PaymentMethod::create(['name' => 'Transferencia']);

        CashRegister::create([
            'user_id' => $this->user->id,
            'branch_id' => $branch->id,
            'initial_amount' => 0,
            'opened_at' => now(),
            'status' => 'open',
        ]);

        $repair = Repair::create([
            'code' => 'REP952',
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'iPhone 12',
            'issue_description' => 'Cambio de batería',
            'priority' => 'Media',
            'status' => 'Terminado',
            'intake_date' => now()->toDateString(),
            'sale_price_without_iva' => 1000,
            'iva_percentage' => 21,
            'sale_price_with_iva' => 1210,
            'sale_price' => 1210,
        ]);

        $payResponse = $this->postJson("/api/repairs/{$repair->id}/mark-as-paid", [
            'branch_id' => $branch->id,
            'charge_with_iva' => true,
            'payments' => [
                ['payment_method_id' => $cashMethod->id, 'amount' => 400],
                ['payment_method_id' => $transferMethod->id, 'amount' => 300],
            ],
        ]);

        $payResponse->assertStatus(200);

        $paymentToRevertId = DB::table('repair_payments')
            ->where('repair_id', $repair->id)
            ->orderBy('id')
            ->value('id');

        $this->assertNotNull($paymentToRevertId);

        $unpayResponse = $this->postJson("/api/repairs/{$repair->id}/mark-as-unpaid", [
            'payment_id' => $paymentToRevertId,
        ]);

        $unpayResponse->assertStatus(200);

        $repair->refresh();
        $this->assertEquals('partial', $repair->payment_status);
        $this->assertEquals(300.0, (float) $repair->total_paid);

        $this->assertDatabaseHas('repair_payments', [
            'id' => $paymentToRevertId,
            'is_reversed' => true,
        ]);
    }
}
