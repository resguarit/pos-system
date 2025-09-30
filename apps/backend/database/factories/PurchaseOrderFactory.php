<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PurchaseOrder>
 */
class PurchaseOrderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'supplier_id' => 1, // Ajusta si necesitas randomizar
            'branch_id' => 1, // Ajusta si necesitas randomizar
            'status' => 'pending',
            'total_amount' => $this->faker->randomFloat(2, 1000, 10000),
            'order_date' => $this->faker->date(),
            'notes' => $this->faker->sentence(),
        ];
    }
}
