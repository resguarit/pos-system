<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Customer;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\Person;
use App\Models\RepairPayment;
use App\Models\Repair;
use App\Models\SaleHeader;
use App\Models\PaymentMethod;
use App\Services\CurrentAccountService;
use App\Models\ReceiptType;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CurrentAccountBalanceReproductionTest extends TestCase
{
    use RefreshDatabase;

    private function getOrCreateAuthUser(): User
    {
        $existingUser = User::first();
        if ($existingUser) {
            return $existingUser;
        }

        return User::create([
            'email' => 'test.current.account@example.com',
            'username' => 'test_current_account_user',
            'password' => bcrypt('password'),
            'active' => true,
            'role_id' => null,
            'person_id' => null,
        ]);
    }

    public function test_sale_payment_updates_status_correctly()
    {
        // 1. Setup
        $user = $this->getOrCreateAuthUser();
        $this->actingAs($user);

        $branch = Branch::first();
        if (!$branch) {
            $branch = Branch::factory()->create();
        }

        CashRegister::create([
            'user_id' => $user->id,
            'branch_id' => $branch->id,
            'initial_amount' => 0,
            'opened_at' => now(),
            'status' => 'open',
        ]);

        $person = Person::create([
            'first_name' => 'Cliente',
            'last_name' => 'Prueba',
            'person_type' => 'person',
            'fiscal_condition_id' => null,
            'person_type_id' => null,
            'document_type_id' => null,
        ]);
        $customer = Customer::create([
            'person_id' => $person->id,
            'email' => 'cliente.prueba@example.com',
            'active' => true,
        ]);
        $accountService = app(CurrentAccountService::class);

        // Ensure account exists
        $account = $accountService->getAccountByCustomer($customer->id);
        if (!$account) {
            $account = $accountService->createAccount([
                'customer_id' => $customer->id,
                'credit_limit' => 100000,
            ]);
        }

        // Create Receipt Type if needed
        $receiptType = ReceiptType::firstOrCreate(
            ['afip_code' => '6'],
            ['description' => 'Factura B']
        );

        // Create Sales
        $sale = SaleHeader::create([
            'date' => now(),
            'receipt_type_id' => $receiptType->id,
            'branch_id' => $branch->id,
            'receipt_number' => '00000999',
            'numbering_scope' => \App\Constants\SaleNumberingScope::SALE,
            'customer_id' => $customer->id,
            'total' => 12900.00,
            'subtotal' => 12900.00,
            'total_iva_amount' => 0,
            'discount_amount' => 0,
            'iibb' => 0,
            'internal_tax' => 0,
            'paid_amount' => 0,
            'status' => 'approved',
            'payment_status' => 'pending',
            'user_id' => $user->id,
        ]);

        // Ensure MovementType exists for 'Pago de venta'
        // In the real app, seeds should have created this.

        $paymentMethod = PaymentMethod::first();
        if (!$paymentMethod) {
            $paymentMethod = PaymentMethod::create(['name' => 'Efectivo']);
        }

        echo "\nInitial Sale Status: " . $sale->payment_status . "\n";
        echo "Initial Pending Amount: " . $sale->pending_amount . "\n";

        // 2. Process Payment
        $paymentData = [
            'sale_payments' => [
                [
                    'sale_id' => $sale->id,
                    'amount' => 12900.00
                ]
            ],
            'payment_method_id' => $paymentMethod->id,
            'branch_id' => $branch->id
        ];

        try {
            $result = $accountService->processPayment($account->id, $paymentData);
            echo "Payment processed successfully.\n";
        } catch (\Exception $e) {
            echo "Payment failed: " . $e->getMessage() . "\n";
            throw $e;
        }

        // 3. Verify
        $sale->refresh();
        echo "Final Sale Status: " . $sale->payment_status . "\n";
        echo "Final Pending Amount: " . $sale->pending_amount . "\n";

        $resource = new \App\Http\Resources\CurrentAccountResource($account);
        $resourceData = $resource->toArray(request());

        echo "Total Pending Debt from Resource: " . $resourceData['total_pending_debt'] . "\n";

        $this->assertEquals('paid', $sale->payment_status);
        $this->assertEquals(0, $sale->pending_amount);
        $this->assertEquals(0, $resourceData['total_pending_debt']);
    }

    public function test_credit_note_does_not_add_debt_for_paid_sale()
    {
        $user = $this->getOrCreateAuthUser();
        $this->actingAs($user);

        $branch = Branch::first();
        if (!$branch) {
            $branch = Branch::factory()->create();
        }

        CashRegister::create([
            'user_id' => $user->id,
            'branch_id' => $branch->id,
            'initial_amount' => 0,
            'opened_at' => now(),
            'status' => 'open',
        ]);

        $person = Person::create([
            'first_name' => 'Cliente',
            'last_name' => 'NC',
            'person_type' => 'person',
            'fiscal_condition_id' => null,
            'person_type_id' => null,
            'document_type_id' => null,
        ]);
        $customer = Customer::create([
            'person_id' => $person->id,
            'email' => 'cliente.nc@example.com',
            'active' => true,
        ]);
        $accountService = app(CurrentAccountService::class);
        $saleService = app(\App\Services\SaleService::class);

        $account = $accountService->getAccountByCustomer($customer->id);
        if (!$account) {
            $account = $accountService->createAccount([
                'customer_id' => $customer->id,
                'credit_limit' => 100000,
            ]);
        }

        $invoiceType = ReceiptType::firstOrCreate(
            ['afip_code' => '6'],
            ['description' => 'Factura B']
        );
        ReceiptType::firstOrCreate(
            ['afip_code' => '8'],
            ['description' => 'Nota de Crédito B']
        );

        $sale = SaleHeader::create([
            'date' => now(),
            'receipt_type_id' => $invoiceType->id,
            'branch_id' => $branch->id,
            'receipt_number' => '00001000',
            'numbering_scope' => \App\Constants\SaleNumberingScope::SALE,
            'customer_id' => $customer->id,
            'total' => 10000.00,
            'subtotal' => 10000.00,
            'total_iva_amount' => 0,
            'discount_amount' => 0,
            'iibb' => 0,
            'internal_tax' => 0,
            'paid_amount' => 10000.00,
            'status' => 'approved',
            'payment_status' => 'paid',
            'user_id' => $user->id,
        ]);

        $before = (new \App\Http\Resources\CurrentAccountResource($account->fresh()))->toArray(request());
        $this->assertEquals(0, (float) $before['total_pending_debt']);

        $saleService->emitCreditNote(
            $sale->id,
            2500.00,
            'Devolución parcial de test',
            $user->id,
            null
        );

        $after = (new \App\Http\Resources\CurrentAccountResource($account->fresh()))->toArray(request());
        $this->assertEquals(0, (float) $after['total_pending_debt']);
    }

    public function test_current_account_resource_includes_repair_debt_breakdown()
    {
        $user = $this->getOrCreateAuthUser();
        $this->actingAs($user);

        $branch = Branch::first();
        if (!$branch) {
            $branch = Branch::factory()->create();
        }

        $person = Person::create([
            'first_name' => 'Cliente',
            'last_name' => 'Reparación',
            'person_type' => 'person',
            'fiscal_condition_id' => null,
            'person_type_id' => null,
            'document_type_id' => null,
        ]);

        $customer = Customer::create([
            'person_id' => $person->id,
            'email' => 'cliente.reparacion@example.com',
            'active' => true,
        ]);

        $accountService = app(CurrentAccountService::class);
        $account = $accountService->createAccount([
            'customer_id' => $customer->id,
            'credit_limit' => 100000,
        ]);

        Repair::create([
            'code' => 'REP-DEBT-001',
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'Notebook',
            'issue_description' => 'Pantalla rota',
            'status' => 'Entregado',
            'intake_date' => now()->toDateString(),
            'sale_price_without_iva' => 10000.00,
            'iva_percentage' => 21.00,
            'sale_price_with_iva' => 12100.00,
            'sale_price' => 12100.00,
            'charge_with_iva' => true,
            'is_paid' => false,
            'payment_status' => 'pending',
            'total_paid' => 0,
        ]);

        $resourceData = (new \App\Http\Resources\CurrentAccountResource($account->fresh()))->toArray(request());

        $this->assertEquals(12100.00, (float) $resourceData['total_pending_debt']);
        $this->assertEquals(0.00, (float) $resourceData['sales_pending_debt']);
        $this->assertEquals(12100.00, (float) $resourceData['repairs_pending_debt']);
        $this->assertEquals(12100.00, (float) $resourceData['debt_breakdown']['repairs']['amount']);
        $this->assertEquals(1, $resourceData['debt_breakdown']['repairs']['count']);
    }

    public function test_current_account_resource_uses_active_repair_payments_for_pending_amount()
    {
        $user = $this->getOrCreateAuthUser();
        $this->actingAs($user);

        $branch = Branch::first();
        if (!$branch) {
            $branch = Branch::factory()->create();
        }

        $paymentMethod = PaymentMethod::first() ?: PaymentMethod::create(['name' => 'Efectivo']);

        $person = Person::create([
            'first_name' => 'Cliente',
            'last_name' => 'Parcial',
            'person_type' => 'person',
            'fiscal_condition_id' => null,
            'person_type_id' => null,
            'document_type_id' => null,
        ]);

        $customer = Customer::create([
            'person_id' => $person->id,
            'email' => 'cliente.parcial@example.com',
            'active' => true,
        ]);

        $accountService = app(CurrentAccountService::class);
        $account = $accountService->createAccount([
            'customer_id' => $customer->id,
            'credit_limit' => 100000,
        ]);

        $repair = Repair::create([
            'code' => 'REP-PARTIAL-001',
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'Notebook',
            'issue_description' => 'Cambio de display',
            'status' => 'Entregado',
            'intake_date' => now()->toDateString(),
            'sale_price_without_iva' => 1000.00,
            'iva_percentage' => 21.00,
            'sale_price_with_iva' => 1210.00,
            'sale_price' => 1210.00,
            'charge_with_iva' => true,
            'is_paid' => false,
            'payment_status' => 'partial',
            'total_paid' => 0,
        ]);

        RepairPayment::create([
            'repair_id' => $repair->id,
            'payment_method_id' => $paymentMethod->id,
            'amount' => 500.00,
            'charge_with_iva' => true,
            'paid_at' => now(),
            'is_reversed' => false,
            'user_id' => $user->id,
        ]);

        $resourceData = (new \App\Http\Resources\CurrentAccountResource($account->fresh()))->toArray(request());

        $this->assertEquals(710.00, (float) $resourceData['total_pending_debt']);
        $this->assertEquals(710.00, (float) $resourceData['repairs_pending_debt']);
        $this->assertEquals(1, $resourceData['debt_breakdown']['repairs']['count']);
    }

    public function test_pending_items_endpoint_returns_sales_and_repairs()
    {
        $user = $this->getOrCreateAuthUser();
        $this->actingAs($user);
        $this->withoutMiddleware();

        $branch = Branch::first();
        if (!$branch) {
            $branch = Branch::factory()->create();
        }

        $person = Person::create([
            'first_name' => 'Cliente',
            'last_name' => 'Mixto',
            'person_type' => 'person',
            'fiscal_condition_id' => null,
            'person_type_id' => null,
            'document_type_id' => null,
        ]);

        $customer = Customer::create([
            'person_id' => $person->id,
            'email' => 'cliente.mixto@example.com',
            'active' => true,
        ]);

        $accountService = app(CurrentAccountService::class);
        $account = $accountService->createAccount([
            'customer_id' => $customer->id,
            'credit_limit' => 100000,
        ]);

        SaleHeader::create([
            'date' => now(),
            'receipt_type_id' => ReceiptType::firstOrCreate(['afip_code' => '6'], ['description' => 'Factura B'])->id,
            'branch_id' => $branch->id,
            'receipt_number' => '00002000',
            'numbering_scope' => \App\Constants\SaleNumberingScope::SALE,
            'customer_id' => $customer->id,
            'total' => 1000.00,
            'subtotal' => 1000.00,
            'total_iva_amount' => 0,
            'discount_amount' => 0,
            'iibb' => 0,
            'internal_tax' => 0,
            'paid_amount' => 0,
            'status' => 'approved',
            'payment_status' => 'pending',
            'user_id' => $user->id,
        ]);

        Repair::create([
            'code' => 'REP-MIX-001',
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'device' => 'Notebook',
            'issue_description' => 'Cambio de pantalla',
            'status' => 'Entregado',
            'intake_date' => now()->toDateString(),
            'sale_price_without_iva' => 1000.00,
            'iva_percentage' => 21.00,
            'sale_price_with_iva' => 1210.00,
            'sale_price' => 1210.00,
            'charge_with_iva' => true,
            'is_paid' => false,
            'payment_status' => 'pending',
            'total_paid' => 0,
        ]);

        $response = $this->getJson("/api/current-accounts/{$account->id}/pending-items");

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');

        $kinds = collect($response->json('data'))->pluck('kind')->all();

        $this->assertContains('sale', $kinds);
        $this->assertContains('repair', $kinds);
    }
}
