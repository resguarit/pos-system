<?php

namespace Tests\Unit;

use App\Services\StockService;
use Illuminate\Database\QueryException;
use Mockery;
use Tests\TestCase;
use Exception;

class StockServiceTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_get_or_create_stock_handles_duplicate_insert_race()
    {
        $stockAlias = Mockery::mock('alias:App\\Models\\Stock');
        $builder = Mockery::mock();
        $existingStock = new \App\Models\Stock();
        $existingStock->id = 1;
        $existingStock->product_id = 10;
        $existingStock->branch_id = 20;

        $builder->shouldReceive('where')->andReturnSelf();
        $builder->shouldReceive('lockForUpdate')->andReturnSelf();
        $builder->shouldReceive('first')->andReturn(null, $existingStock);

        $stockAlias->shouldReceive('where')->andReturn($builder);

        $previous = new Exception('Duplicate entry', 23000);
        $queryException = new QueryException('mysql', 'insert into stocks', [], $previous);
        $stockAlias->shouldReceive('create')->andThrow($queryException);

        $service = new StockService();
        $method = new \ReflectionMethod($service, 'getOrCreateStockLocked');
        $method->setAccessible(true);

        $result = $method->invoke($service, 10, 20);

        $this->assertSame($existingStock, $result);
    }

    public function test_get_or_create_stock_returns_friendly_error_when_race_never_resolves()
    {
        $stockAlias = Mockery::mock('alias:App\\Models\\Stock');
        $builder = Mockery::mock();

        $builder->shouldReceive('where')->andReturnSelf();
        $builder->shouldReceive('lockForUpdate')->andReturnSelf();
        $builder->shouldReceive('first')->andReturn(null);

        $stockAlias->shouldReceive('where')->andReturn($builder);

        $previous = new Exception('Duplicate entry', 23000);
        $queryException = new QueryException('mysql', 'insert into stocks', [], $previous);
        $stockAlias->shouldReceive('create')->andThrow($queryException);

        $service = new StockService();
        $method = new \ReflectionMethod($service, 'getOrCreateStockLocked');
        $method->setAccessible(true);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('No se pudo crear u obtener el stock. Intente nuevamente.');

        $method->invoke($service, 10, 20);
    }

    public function test_get_or_create_stock_rethrows_non_duplicate_errors()
    {
        $stockAlias = Mockery::mock('alias:App\\Models\\Stock');
        $builder = Mockery::mock();

        $builder->shouldReceive('where')->andReturnSelf();
        $builder->shouldReceive('lockForUpdate')->andReturnSelf();
        $builder->shouldReceive('first')->andReturn(null);

        $stockAlias->shouldReceive('where')->andReturn($builder);

        $previous = new Exception('DB down', 99999);
        $queryException = new QueryException('mysql', 'insert into stocks', [], $previous);
        $stockAlias->shouldReceive('create')->andThrow($queryException);

        $service = new StockService();
        $method = new \ReflectionMethod($service, 'getOrCreateStockLocked');
        $method->setAccessible(true);

        $this->expectException(QueryException::class);

        $method->invoke($service, 10, 20);
    }
}
