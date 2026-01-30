<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Customer;
use App\Models\Branch;
use App\Models\SaleHeader;
use App\Models\CurrentAccount;
use App\Models\PaymentMethod;
use App\Services\CurrentAccountService;
use App\Models\ReceiptType;
use App\Models\MovementType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class CurrentAccountBalanceReproductionTest extends TestCase
{
    use RefreshDatabase;

    public function test_sale_payment_updates_status_correctly()
    {
        // 1. Setup
        $user = User::first();
        $this->actingAs($user);

        $branch = Branch::first();
        if (!$branch) {
            $branch = Branch::create(['name' => 'Test Branch', 'description' => 'Test Branch']);
        }

        $customer = Customer::factory()->create();
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
        $receiptType = ReceiptType::first();

        // Create Sales
        $sale = SaleHeader::create([
            'date' => now(),
            'receipt_type_id' => $receiptType->id ?? 1,
            'branch_id' => $branch->id,
            'receipt_number' => '00000999',
            'numbering_scope' => \App\Constants\SaleNumberingScope::SALE,
            'customer_id' => $customer->id,
            'total' => 12900.00,
            'subtotal' => 12900.00,
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
}
