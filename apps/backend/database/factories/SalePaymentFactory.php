<?php

namespace Database\Factories;

use App\Models\PaymentMethod;
use App\Models\SaleHeader;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SalePayment>
 */
class SalePaymentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'sale_header_id' => SaleHeader::inRandomOrder()->first()->id ?? SaleHeader::factory(),
            'payment_method_id' => PaymentMethod::inRandomOrder()->first()->id ?? PaymentMethod::factory(),
            'amount' => $this->faker->randomFloat(2, 10, 100),
        ];
    }
}
