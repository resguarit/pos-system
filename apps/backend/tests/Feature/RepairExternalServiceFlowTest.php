<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckAccessSchedule;
use App\Http\Middleware\CheckPermission;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CurrentAccount;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\PaymentMethod;
use App\Models\Repair;
use App\Models\SubcontractedService;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RepairExternalServiceFlowTest extends TestCase
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

    public function test_can_derive_repair_to_external_supplier_and_create_supplier_debt(): void
    {
        $branch = Branch::factory()->create();
        $customer = Customer::factory()->create();
        $supplier = Supplier::factory()->create();

        $repair = Repair::create([
            'code' => 'REP-EXT-001',
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'iPhone 13',
            'issue_description' => 'Falla de placa',
            'priority' => 'Alta',
            'status' => 'En diagnóstico',
            'intake_date' => now()->toDateString(),
            'cost' => 600,
            'sale_price_without_iva' => 1200,
            'iva_percentage' => 21,
            'sale_price_with_iva' => 1452,
            'sale_price' => 1452,
        ]);

        $response = $this->postJson("/api/repairs/{$repair->id}/derive-to-external", [
            'supplier_id' => $supplier->id,
            'agreed_cost' => 850,
            'description' => 'Derivación placa base',
            'notes' => 'Urgente',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'Reparación Externa')
            ->assertJsonPath('data.external_service.supplier_id', $supplier->id)
            ->assertJsonPath('data.external_service.agreed_cost', 850)
            ->assertJsonPath('data.external_service.payment_status', 'pending');

        $service = SubcontractedService::where('repair_id', $repair->id)->first();
        $this->assertNotNull($service);

        $supplierAccount = CurrentAccount::where('supplier_id', $supplier->id)->first();
        $this->assertNotNull($supplierAccount);
        $this->assertEquals(850.0, (float) $supplierAccount->current_balance);

        $this->assertDatabaseHas('current_account_movements', [
            'current_account_id' => $supplierAccount->id,
            'amount' => 850.00,
            'reference' => $repair->code,
        ]);
    }

    public function test_can_register_partial_payment_for_external_service_by_repair(): void
    {
        $branch = Branch::factory()->create();
        $customer = Customer::factory()->create();
        $supplier = Supplier::factory()->create();
        $paymentMethod = PaymentMethod::create(['name' => 'Transferencia']);

        $repair = Repair::create([
            'code' => 'REP-EXT-002',
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'Samsung S23',
            'issue_description' => 'Reemplazo display',
            'priority' => 'Media',
            'status' => 'Reparación Externa',
            'intake_date' => now()->toDateString(),
            'cost' => 500,
            'sale_price_without_iva' => 1000,
            'iva_percentage' => 21,
            'sale_price_with_iva' => 1210,
            'sale_price' => 1210,
        ]);

        $cashRegister = CashRegister::create([
            'user_id' => $this->user->id,
            'branch_id' => $branch->id,
            'initial_amount' => 50000,
            'opened_at' => now(),
            'status' => 'open',
        ]);

        $this->postJson("/api/repairs/{$repair->id}/derive-to-external", [
            'supplier_id' => $supplier->id,
            'agreed_cost' => 1000,
        ])->assertStatus(200);

        $payResponse = $this->postJson("/api/repairs/{$repair->id}/external-service/payments", [
            'amount' => 300,
            'payment_method_id' => $paymentMethod->id,
            'cash_register_id' => $cashRegister->id,
            'notes' => 'Pago parcial inicial',
        ]);

        $payResponse->assertStatus(200)
            ->assertJsonPath('data.external_service.payment_status', 'partial')
            ->assertJsonPath('data.external_service.paid_amount', 300)
            ->assertJsonPath('data.external_service.pending_amount', 700);

        $service = SubcontractedService::where('repair_id', $repair->id)->firstOrFail();
        $supplierAccount = CurrentAccount::where('supplier_id', $supplier->id)->firstOrFail();

        $this->assertEquals(300.0, (float) $service->paid_amount);
        $this->assertEquals('partial', $service->payment_status);
        $this->assertEquals(700.0, (float) $supplierAccount->current_balance);

        $this->assertDatabaseHas('subcontracted_service_payments', [
            'subcontracted_service_id' => $service->id,
            'payment_method_id' => $paymentMethod->id,
            'amount' => 300.00,
        ]);

        $expense = Expense::query()
            ->where('branch_id', $branch->id)
            ->where('payment_method_id', $paymentMethod->id)
            ->where('amount', 300)
            ->latest('id')
            ->first();

        $this->assertNotNull($expense);
        $this->assertEquals('paid', $expense->status);
        $this->assertNotNull($expense->cash_movement_id);

        $this->assertDatabaseHas('cash_movements', [
            'id' => $expense->cash_movement_id,
            'cash_register_id' => $cashRegister->id,
            'amount' => 300,
            'reference_type' => 'current_account_movement',
        ]);
    }

    public function test_external_service_payment_rejects_overpayment(): void
    {
        $branch = Branch::factory()->create();
        $customer = Customer::factory()->create();
        $supplier = Supplier::factory()->create();
        $paymentMethod = PaymentMethod::create(['name' => 'Efectivo']);

        $repair = Repair::create([
            'code' => 'REP-EXT-003',
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'Motorola Edge',
            'issue_description' => 'Micro soldadura',
            'priority' => 'Alta',
            'status' => 'Reparación Externa',
            'intake_date' => now()->toDateString(),
            'cost' => 300,
            'sale_price_without_iva' => 800,
            'iva_percentage' => 21,
            'sale_price_with_iva' => 968,
            'sale_price' => 968,
        ]);

        $this->postJson("/api/repairs/{$repair->id}/derive-to-external", [
            'supplier_id' => $supplier->id,
            'agreed_cost' => 400,
        ])->assertStatus(200);

        $overpayResponse = $this->postJson("/api/repairs/{$repair->id}/external-service/payments", [
            'amount' => 450,
            'payment_method_id' => $paymentMethod->id,
        ]);

        $overpayResponse->assertStatus(422)
            ->assertJsonPath('error', 'El pago supera el saldo pendiente de la derivación externa.');
    }
}
