<?php

namespace Tests\Unit\Models;

use App\Models\Product;
use Tests\TestCase;

class ProductTest extends TestCase
{
    /** @test */
    public function it_calculates_sale_price_correctly()
    {
        // Arrange
        $product = new Product([
            'unit_price' => 1000.0,
            'currency' => 'ARS',
            'markup' => 0.20, // 20%
            'iva_id' => null
        ]);

        // Act
        $salePrice = $product->sale_price;

        // Assert
        $expected = 1000.0 * (1 + 0.20); // 1200
        $this->assertEquals($expected, $salePrice);
    }

    /** @test */
    public function it_calculates_markup_from_sale_price()
    {
        // Arrange
        $product = new Product([
            'unit_price' => 1000.0,
            'currency' => 'ARS',
            'markup' => 0.20, // 20%
            'iva_id' => null
        ]);

        // Act
        $calculatedMarkup = $product->calculateMarkupFromSalePrice(1200.0);

        // Assert
        $expected = (1200.0 / 1000.0) - 1; // 0.20 (20%)
        $this->assertEqualsWithDelta($expected, $calculatedMarkup, 0.0001);
    }

    /** @test */
    public function it_validates_pricing_correctly()
    {
        // Valid product
        $product = new Product([
            'unit_price' => 1000.0,
            'markup' => 0.20,
            'sale_price' => 1200.0
        ]);
        $this->assertTrue($product->validatePricing());

        // Invalid product (negative unit price)
        $product = new Product([
            'unit_price' => -100.0,
            'markup' => 0.20,
            'sale_price' => 1200.0
        ]);
        $this->assertFalse($product->validatePricing());
    }

    /** @test */
    public function it_converts_markup_percentage_to_decimal()
    {
        // Arrange
        $product = new Product();
        
        // Act - Set markup as percentage (20%)
        $product->markup = 20;
        
        // Assert - Should be converted to decimal (0.20)
        $this->assertEquals(0.20, $product->markup);
    }

    /** @test */
    public function it_keeps_markup_as_decimal_when_already_decimal()
    {
        // Arrange
        $product = new Product();
        
        // Act - Set markup as decimal (0.20)
        $product->markup = 0.20;
        
        // Assert - Should remain as decimal
        $this->assertEquals(0.20, $product->markup);
    }
}