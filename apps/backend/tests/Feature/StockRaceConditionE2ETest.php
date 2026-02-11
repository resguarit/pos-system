<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Product;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;
use PDO;
use Tests\TestCase;

class StockRaceConditionE2ETest extends TestCase
{
    private function getMysqlPdo(): ?PDO
    {
        $config = config('database.connections.mysql');
        if (!$config) {
            return null;
        }

        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;port=%s;charset=%s',
            $config['host'],
            $config['database'],
            $config['port'],
            $config['charset']
        );

        try {
            return new PDO($dsn, $config['username'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]);
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function test_unique_constraint_and_stock_service_handle_race_condition()
    {
        $pdo1 = $this->getMysqlPdo();
        $pdo2 = $this->getMysqlPdo();
        if (!$pdo1 || !$pdo2) {
            $this->markTestSkipped('Requires a working MySQL connection to validate race conditions.');
        }

        config(['database.default' => 'mysql']);

        $product = Product::factory()->create();
        $branch = Branch::factory()->create();

        $now = date('Y-m-d H:i:s');
        $insertSql = "INSERT INTO stocks (product_id, branch_id, current_stock, created_at, updated_at) VALUES (?, ?, ?, ?, ?)";

        $pdo1->beginTransaction();
        $pdo2->beginTransaction();

        // Simulate race: second connection inserts first
        $stmt2 = $pdo2->prepare($insertSql);
        $stmt2->execute([$product->id, $branch->id, 0, $now, $now]);
        $pdo2->commit();

        $duplicateError = null;
        try {
            $stmt1 = $pdo1->prepare($insertSql);
            $stmt1->execute([$product->id, $branch->id, 0, $now, $now]);
            $pdo1->commit();
        } catch (\Exception $e) {
            $duplicateError = $e;
            $pdo1->rollBack();
        }

        $this->assertNotNull($duplicateError, 'Expected duplicate insert to fail.');

        $count = DB::table('stocks')
            ->where('product_id', $product->id)
            ->where('branch_id', $branch->id)
            ->count();

        $this->assertSame(1, $count, 'Only one stock row should exist after duplicate insert attempt.');

        // StockService should operate on the existing row without creating duplicates
        $service = new StockService();
        $service->reduceStockByProductAndBranch($product->id, $branch->id, 1, 'transfer', null, 'E2E test', true);

        $countAfter = DB::table('stocks')
            ->where('product_id', $product->id)
            ->where('branch_id', $branch->id)
            ->count();

        $this->assertSame(1, $countAfter, 'StockService should not create duplicate rows.');
    }
}
