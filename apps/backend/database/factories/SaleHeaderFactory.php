<?php

namespace Database\Factories;

use App\Constants\SaleNumberingScope;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\ReceiptType;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SaleHeader>
 */
class SaleHeaderFactory extends Factory
{
    public function definition(): array
    {
        $subtotal = $this->faker->randomFloat(3, 80, 800);
        $total_iva_amount = $subtotal * 0.21; // 21% IVA
        $iibb = $this->faker->optional()->randomFloat(3, 5, 50);
        $internal_tax = $this->faker->optional()->randomFloat(3, 2, 30);
        $discount_amount = $this->faker->optional()->randomFloat(3, 0, 40);

        $total = $subtotal + $total_iva_amount + ($iibb ?? 0) + ($internal_tax ?? 0) - ($discount_amount ?? 0);

        return [
            'customer_id' => Customer::inRandomOrder()->first()->id ?? Customer::factory(),
            'branch_id' => Branch::inRandomOrder()->first()->id ?? Branch::factory(),
            'receipt_type_id' => ReceiptType::inRandomOrder()->first()->id ?? ReceiptType::factory(),
            'user_id' => User::inRandomOrder()->first()->id ?? User::factory(),
            'receipt_number' => $this->faker->unique()->numberBetween(1000, 9999),
            'numbering_scope' => SaleNumberingScope::SALE,
            'date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'subtotal' => $subtotal,
            'total_iva_amount' => $total_iva_amount,
            'iibb' => $iibb,
            'internal_tax' => $internal_tax,
            'discount_amount' => $discount_amount,
            'total' => $total,
        ];
    }
}
