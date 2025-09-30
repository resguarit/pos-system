<?php

namespace Database\Factories;

use App\Models\Stock;
use App\Models\Branch;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class StockFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = Stock::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'branch_id' => Branch::inRandomOrder()->first()->id ?? Branch::factory()->create()->id,
            'product_id' => Product::inRandomOrder()->first()->id ?? Product::factory()->create()->id,
            'current_stock' => $this->faker->numberBetween(1, 100),
            'min_stock' => $this->faker->numberBetween(1, 10),
            'max_stock' => $this->faker->numberBetween(50, 200),
        ];
    }
}