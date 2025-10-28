<?php

namespace Database\Factories;

use App\Models\CurrentAccount;
use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

class CurrentAccountFactory extends Factory
{
    protected $model = CurrentAccount::class;

    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'credit_limit' => $this->faker->randomFloat(2, 1000, 50000),
            'current_balance' => $this->faker->randomFloat(2, -1000, 1000),
            'status' => $this->faker->randomElement(['active', 'suspended', 'closed']),
            'notes' => $this->faker->optional()->sentence(),
            'opened_at' => $this->faker->dateTimeBetween('-2 years', 'now'),
            'closed_at' => null,
            'last_movement_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
        ]);
    }

    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'suspended',
        ]);
    }

    public function closed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'closed',
            'closed_at' => $this->faker->dateTimeBetween('-1 year', 'now'),
        ]);
    }
}

