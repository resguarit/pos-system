<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Sale>
 */
class SaleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'customer_id' => 1, // Ajusta si necesitas randomizar
            'branch_id' => 1, // Ajusta si necesitas randomizar
            'date' => $this->faker->date(),
            'total' => $this->faker->randomFloat(2, 100, 1000),
        ];
    }
}
