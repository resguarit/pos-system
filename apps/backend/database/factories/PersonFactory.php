<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Person>
 */
class PersonFactory extends Factory
{
    public function definition(): array
    {
        return [
            'first_name' => $this->faker->firstName(),
            'last_name' => $this->faker->lastName(),
            'documento' => $this->faker->unique()->numerify('########'),
            'document_type_id' => 1, // Ajusta según tus seeds
            'person_type_id' => 1, // Ajusta según tus seeds
            'fiscal_condition_id' => 1, // Ajusta según tus seeds
            'address' => $this->faker->address(),
            'phone' => $this->faker->phoneNumber(),
            'cuit' => $this->faker->numerify('20#########'),
            'credit_limit' => $this->faker->randomFloat(2, 0, 10000),
            'person_type' => 'person',
        ];
    }
}
