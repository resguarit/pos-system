<?php

namespace Database\Factories;

use App\Models\CurrentAccountMovement;
use App\Models\CurrentAccount;
use App\Models\MovementType;
use Illuminate\Database\Eloquent\Factories\Factory;

class CurrentAccountMovementFactory extends Factory
{
    protected $model = CurrentAccountMovement::class;

    public function definition(): array
    {
        $amount = $this->faker->randomFloat(2, 10, 1000);
        $isInflow = $this->faker->boolean();
        
        return [
            'current_account_id' => CurrentAccount::factory(),
            'movement_type_id' => MovementType::factory(),
            'amount' => $amount,
            'description' => $this->faker->sentence(),
            'reference' => $this->faker->optional()->numerify('REF-####'),
            'balance_before' => $this->faker->randomFloat(2, -5000, 5000),
            'balance_after' => $this->faker->randomFloat(2, -5000, 5000),
            'metadata' => $this->faker->optional()->randomElements([
                'payment_method' => $this->faker->randomElement(['cash', 'transfer', 'check']),
                'branch_id' => $this->faker->numberBetween(1, 3),
            ]),
            'user_id' => null,
            'movement_date' => $this->faker->dateTimeBetween('-1 month', 'now'),
        ];
    }

    public function inflow(): static
    {
        return $this->state(function (array $attributes) {
            $amount = $this->faker->randomFloat(2, 10, 1000);
            return [
                'amount' => $amount,
                'balance_after' => $attributes['balance_before'] + $amount,
            ];
        });
    }

    public function outflow(): static
    {
        return $this->state(function (array $attributes) {
            $amount = $this->faker->randomFloat(2, 10, 1000);
            return [
                'amount' => $amount,
                'balance_after' => $attributes['balance_before'] - $amount,
            ];
        });
    }
}

