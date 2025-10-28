<?php

declare(strict_types=1);

namespace Tests\Unit\Controllers;

use Tests\TestCase;
use App\Http\Controllers\ComboController;
use App\Interfaces\ComboServiceInterface;
use App\Models\Combo;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Mockery;

class ComboControllerTest extends TestCase
{
    protected ComboServiceInterface $mockComboService;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Crear un mock del servicio
        $this->mockComboService = Mockery::mock(ComboServiceInterface::class);
        
        // Bindear el mock al container
        $this->app->instance(ComboServiceInterface::class, $this->mockComboService);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_index_returns_combos_successfully(): void
    {
        // Arrange
        $expectedCombos = collect([
            Combo::factory()->make(['id' => 1, 'name' => 'Combo 1']),
            Combo::factory()->make(['id' => 2, 'name' => 'Combo 2']),
        ]);

        $this->mockComboService
            ->shouldReceive('getAll')
            ->once()
            ->with(['active_only' => false, 'branch_id' => null])
            ->andReturn($expectedCombos);

        $request = Request::create('/combos', 'GET');

        // Act
        $controller = new ComboController($this->mockComboService);
        $response = $controller->index($request);

        // Assert
        $this->assertInstanceOf(JsonResponse::class, $response);
        $responseData = $response->getData(true);
        
        $this->assertTrue($responseData['success']);
        $this->assertEquals('Combos obtenidos exitosamente', $responseData['message']);
        $this->assertCount(2, $responseData['data']);
    }

    public function test_store_creates_combo_successfully(): void
    {
        // Arrange
        $comboData = [
            'name' => 'Test Combo',
            'description' => 'A test combo',
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'is_active' => true,
            'items' => [
                ['product_id' => 1, 'quantity' => 2],
                ['product_id' => 2, 'quantity' => 1],
            ],
        ];

        $createdCombo = Combo::factory()->make(['id' => 1, 'name' => 'Test Combo']);

        $this->mockComboService
            ->shouldReceive('validateComboData')
            ->once()
            ->with($comboData)
            ->andReturn([]); // No validation errors

        $this->mockComboService
            ->shouldReceive('create')
            ->once()
            ->with($comboData)
            ->andReturn($createdCombo);

        $request = Request::create('/combos', 'POST', $comboData);

        // Act
        $controller = new ComboController($this->mockComboService);
        $response = $controller->store($request);

        // Assert
        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(201, $response->getStatusCode());
        
        $responseData = $response->getData(true);
        $this->assertTrue($responseData['success']);
        $this->assertEquals('Combo creado exitosamente', $responseData['message']);
    }

    public function test_store_returns_validation_errors(): void
    {
        // Arrange
        $comboData = [
            'name' => '', // Invalid empty name
            'discount_type' => 'invalid',
            'items' => [], // Empty items
        ];

        $validationErrors = [
            'El nombre del combo es requerido',
            'El tipo de descuento debe ser "percentage" o "fixed_amount"',
            'El combo debe tener al menos un producto',
        ];

        $this->mockComboService
            ->shouldReceive('validateComboData')
            ->once()
            ->with($comboData)
            ->andReturn($validationErrors);

        $request = Request::create('/combos', 'POST', $comboData);

        // Act
        $controller = new ComboController($this->mockComboService);
        $response = $controller->store($request);

        // Assert
        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(422, $response->getStatusCode());
        
        $responseData = $response->getData(true);
        $this->assertFalse($responseData['success']);
        $this->assertEquals('Datos de validación incorrectos', $responseData['message']);
    }

    public function test_show_returns_combo_with_price_calculation(): void
    {
        // Arrange
        $comboId = 1;
        $combo = Combo::factory()->make(['id' => $comboId, 'name' => 'Test Combo']);
        $priceCalculation = [
            'total_base' => 250.00,
            'total_discount' => 25.00,
            'final_price' => 225.00,
            'currency' => 'ARS',
        ];

        $this->mockComboService
            ->shouldReceive('getById')
            ->once()
            ->with($comboId)
            ->andReturn($combo);

        $this->mockComboService
            ->shouldReceive('calculatePrice')
            ->once()
            ->with($comboId)
            ->andReturn($priceCalculation);

        // Act
        $controller = new ComboController($this->mockComboService);
        $response = $controller->show($comboId);

        // Assert
        $this->assertInstanceOf(JsonResponse::class, $response);
        
        $responseData = $response->getData(true);
        $this->assertTrue($responseData['success']);
        $this->assertEquals('Combo obtenido exitosamente', $responseData['message']);
        $this->assertEquals($combo->toArray(), $responseData['data']['combo']);
        $this->assertEquals($priceCalculation, $responseData['data']['price_calculation']);
    }

    public function test_show_returns_404_when_combo_not_found(): void
    {
        // Arrange
        $comboId = 999;

        $this->mockComboService
            ->shouldReceive('getById')
            ->once()
            ->with($comboId)
            ->andReturn(null);

        // Act
        $controller = new ComboController($this->mockComboService);
        $response = $controller->show($comboId);

        // Assert
        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(404, $response->getStatusCode());
        
        $responseData = $response->getData(true);
        $this->assertFalse($responseData['success']);
        $this->assertEquals('Combo no encontrado', $responseData['message']);
    }

    public function test_calculate_price_returns_price_details(): void
    {
        // Arrange
        $comboId = 1;
        $priceCalculation = [
            'total_base' => 300.00,
            'total_discount' => 30.00,
            'final_price' => 270.00,
            'currency' => 'ARS',
        ];

        $this->mockComboService
            ->shouldReceive('calculatePrice')
            ->once()
            ->with($comboId)
            ->andReturn($priceCalculation);

        // Act
        $controller = new ComboController($this->mockComboService);
        $response = $controller->calculatePrice($comboId);

        // Assert
        $this->assertInstanceOf(JsonResponse::class, $response);
        
        $responseData = $response->getData(true);
        $this->assertTrue($responseData['success']);
        $this->assertEquals('Precio calculado exitosamente', $responseData['message']);
        $this->assertEquals($priceCalculation, $responseData['data']);
    }

    public function test_check_availability_returns_availability_info(): void
    {
        // Arrange
        $comboId = 1;
        $branchId = 1;
        $quantity = 2;
        
        $availability = [
            'is_available' => true,
            'missing_product' => null,
            'available_quantity' => 5,
        ];

        $this->mockComboService
            ->shouldReceive('checkAvailability')
            ->once()
            ->with($comboId, $branchId, $quantity)
            ->andReturn($availability);

        $request = Request::create('/combos/1/check-availability', 'POST', [
            'branch_id' => $branchId,
            'quantity' => $quantity,
        ]);

        // Act
        $controller = new ComboController($this->mockComboService);
        $response = $controller->checkAvailability($request, $comboId);

        // Assert
        $this->assertInstanceOf(JsonResponse::class, $response);
        
        $responseData = $response->getData(true);
        $this->assertTrue($responseData['success']);
        $this->assertEquals('Disponibilidad verificada exitosamente', $responseData['message']);
        $this->assertEquals($availability, $responseData['data']);
    }

    public function test_statistics_returns_combo_statistics(): void
    {
        // Arrange
        $statistics = [
            'total_combos' => 10,
            'active_combos' => 8,
            'inactive_combos' => 2,
        ];

        $this->mockComboService
            ->shouldReceive('getStatistics')
            ->once()
            ->andReturn($statistics);

        // Act
        $controller = new ComboController($this->mockComboService);
        $response = $controller->statistics();

        // Assert
        $this->assertInstanceOf(JsonResponse::class, $response);
        
        $responseData = $response->getData(true);
        $this->assertTrue($responseData['success']);
        $this->assertEquals('Estadísticas obtenidas exitosamente', $responseData['message']);
        $this->assertEquals($statistics, $responseData['data']);
    }
}




