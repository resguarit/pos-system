<?php

namespace Database\Factories;

use App\Models\Iva;
use App\Models\SaleHeader;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SaleIva>
 */
class SaleIvaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'sale_header_id' => SaleHeader::inRandomOrder()->first()->id ?? SaleHeader::factory(),
            'iva_id' => Iva::inRandomOrder()->first()->id ?? Iva::factory(),
            'amount' => $this->faker->randomFloat(2, 1, 50),
        ];
    }
}
