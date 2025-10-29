<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'person_id' => \App\Models\Person::factory(),
            'email' => $this->faker->unique()->safeEmail(),
            'username' => $this->faker->unique()->userName(),
            'email_verified_at' => now(),
            'password' => bcrypt('password'),
            'active' => true,
            'role_id' => 1, // Ajusta si necesitas randomizar
            'remember_token' => Str::random(10),
        ];
    }
}
