<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Customer>
 */
class CustomerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'person_id' => 1, // Ajusta si necesitas randomizar
            'email' => $this->faker->unique()->safeEmail(),
            'active' => true,
            'notes' => $this->faker->sentence(),
        ];
    }
}
