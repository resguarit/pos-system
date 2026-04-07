<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Permission;
use App\Models\Role;
use App\Models\StockTransfer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Database\Seeders\DocumentTypeSeeder;
use Database\Seeders\FiscalConditionSeeder;
use Database\Seeders\PersonTypeSeeder;
use Tests\TestCase;

class StockTransfersGlobalScopeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Factories assume base catalog seeders (document types, fiscal conditions, etc.).
        // Avoid full DatabaseSeeder because it includes DevelopmentSeeder (stocks/products) which can
        // be non-deterministic and may violate unique constraints in sqlite tests.
        $this->seed(DocumentTypeSeeder::class);
        $this->seed(PersonTypeSeeder::class);
        $this->seed(FiscalConditionSeeder::class);
    }

    private function makeTransfer(int $sourceBranchId, int $destinationBranchId, int $userId): StockTransfer
    {
        return StockTransfer::create([
            'source_branch_id' => $sourceBranchId,
            'destination_branch_id' => $destinationBranchId,
            'transfer_date' => now(),
            'status' => 'pending',
            'notes' => null,
            'user_id' => $userId,
        ]);
    }

    public function test_user_without_global_permission_only_sees_transfers_involving_assigned_branches(): void
    {
        $b1 = Branch::factory()->create();
        $b2 = Branch::factory()->create();
        $b3 = Branch::factory()->create();

        $creator = User::factory()->create();

        // Transfers: two involve b1, one does not
        $tA = $this->makeTransfer($b1->id, $b2->id, (int) $creator->id);
        $tB = $this->makeTransfer($b3->id, $b1->id, (int) $creator->id);
        $this->makeTransfer($b2->id, $b3->id, (int) $creator->id);

        $permView = Permission::create([
            'name' => 'ver_transferencias',
            'description' => 'Ver transferencias de stock',
            'module' => 'transferencias',
        ]);

        $role = Role::create(['name' => 'TestRole', 'description' => '']);
        $role->permissions()->sync([$permView->id]);

        $user = User::factory()->create(['role_id' => $role->id]);
        $user->branches()->sync([$b1->id]); // only b1 assigned

        $resp = $this->actingAs($user)->getJson('/api/stock-transfers');
        $resp->assertOk();

        $ids = collect($resp->json())->pluck('id')->all();
        $this->assertContains($tA->id, $ids);
        $this->assertContains($tB->id, $ids);
        $this->assertCount(2, $ids);
    }

    public function test_user_with_global_permission_sees_all_transfers(): void
    {
        $b1 = Branch::factory()->create();
        $b2 = Branch::factory()->create();
        $b3 = Branch::factory()->create();

        $creator = User::factory()->create();

        $tA = $this->makeTransfer($b1->id, $b2->id, (int) $creator->id);
        $tB = $this->makeTransfer($b3->id, $b1->id, (int) $creator->id);
        $tC = $this->makeTransfer($b2->id, $b3->id, (int) $creator->id);

        $permView = Permission::create([
            'name' => 'ver_transferencias',
            'description' => 'Ver transferencias de stock',
            'module' => 'transferencias',
        ]);
        $permGlobal = Permission::create([
            'name' => 'ver_transferencias_todas_sucursales',
            'description' => 'Ver transferencias de todas las sucursales (scope global)',
            'module' => 'transferencias',
        ]);

        $role = Role::create(['name' => 'TestRoleGlobal', 'description' => '']);
        $role->permissions()->sync([$permView->id, $permGlobal->id]);

        $user = User::factory()->create(['role_id' => $role->id]);
        $user->branches()->sync([$b1->id]); // still only b1 assigned

        $resp = $this->actingAs($user)->getJson('/api/stock-transfers');
        $resp->assertOk();

        $ids = collect($resp->json())->pluck('id')->all();
        $this->assertEqualsCanonicalizing([$tA->id, $tB->id, $tC->id], $ids);
    }
}

