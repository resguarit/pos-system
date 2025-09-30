<?php

namespace Tests\Unit\Services;

use App\Services\PricingService;
use Tests\TestCase;

class PricingServiceTest extends TestCase
{
    private PricingService $pricingService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->pricingService = new PricingService();
    }

    /** @test */
    public function it_calculates_sale_price_correctly_for_ars_product()
    {
        // Arrange
        $unitPrice = 1000.0;
        $currency = 'ARS';
        $markup = 0.20; // 20%
        $ivaId = null;

        // Act
        $result = $this->pricingService->calculateSalePrice($unitPrice, $currency, $markup, $ivaId);

        // Assert
        $expected = 1000.0 * (1 + 0.20); // 1200
        $this->assertEquals($expected, $result);
    }

    /** @test */
    public function it_calculates_markup_correctly()
    {
        // Arrange
        $unitPrice = 1000.0;
        $currency = 'ARS';
        $salePrice = 1200.0;
        $ivaId = null;

        // Act
        $result = $this->pricingService->calculateMarkup($unitPrice, $currency, $salePrice, $ivaId);

        // Assert
        $expected = (1200.0 / 1000.0) - 1; // 0.20 (20%)
        $this->assertEqualsWithDelta($expected, $result, 0.0001);
    }

    /** @test */
    public function it_validates_pricing_parameters_correctly()
    {
        // Valid parameters
        $this->assertTrue($this->pricingService->validatePricingParameters(100.0, 0.20, 120.0));
        
        // Invalid unit price
        $this->assertFalse($this->pricingService->validatePricingParameters(0.0, 0.20, 120.0));
        $this->assertFalse($this->pricingService->validatePricingParameters(-10.0, 0.20, 120.0));
        
        // Invalid markup (less than -100%)
        $this->assertFalse($this->pricingService->validatePricingParameters(100.0, -1.5, 120.0));
        
        // Invalid sale price
        $this->assertFalse($this->pricingService->validatePricingParameters(100.0, 0.20, 0.0));
        $this->assertFalse($this->pricingService->validatePricingParameters(100.0, 0.20, -10.0));
    }

    /** @test */
    public function it_rounds_prices_correctly()
    {
        // Test through calculateSalePrice
        $result = $this->pricingService->calculateSalePrice(1000.0, 'ARS', 0.333333, null);
        
        // Should be rounded to 2 decimal places
        $this->assertEquals(1333.33, $result);
    }

    /** @test */
    public function it_formats_prices_correctly()
    {
        $formatted = $this->pricingService->formatPrice(1234.56, 'ARS');
        $this->assertEquals('$1.234,56', $formatted);
        
        $formattedUsd = $this->pricingService->formatPrice(1234.56, 'USD');
        $this->assertEquals('$1.234,56', $formattedUsd);
    }

    /** @test */
    public function it_formats_markup_correctly()
    {
        $formatted = $this->pricingService->formatMarkup(0.205);
        $this->assertEquals('20.50%', $formatted);
    }

    /** @test */
    public function it_handles_edge_cases()
    {
        // Zero markup
        $result = $this->pricingService->calculateSalePrice(1000.0, 'ARS', 0.0, null);
        $this->assertEquals(1000.0, $result);
        
        // Negative markup (discount)
        $result = $this->pricingService->calculateSalePrice(1000.0, 'ARS', -0.10, null);
        $this->assertEquals(900.0, $result);
        
        // Very small amounts
        $result = $this->pricingService->calculateSalePrice(0.01, 'ARS', 0.20, null);
        $this->assertEquals(0.01, $result);
    }
}
