<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Category;
use App\Models\Measure;
use App\Models\Iva;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = Product::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'description' => $this->faker->sentence(3),
            'code' => $this->faker->unique()->numberBetween(1000, 9999),
            'measure_id' => Measure::inRandomOrder()->first()->id ?? Measure::factory()->create()->id,
            'unit_price' => $this->faker->randomFloat(2, 10, 500),
            'markup' => $this->faker->randomFloat(2, 10, 50),
            'category_id' => Category::inRandomOrder()->first()->id ?? Category::factory()->create()->id,
            'iva_id' => Iva::inRandomOrder()->first()->id ?? Iva::factory()->create()->id,
            'image_id' => null,
            'supplier_id' => Supplier::inRandomOrder()->first()->id ?? Supplier::factory()->create()->id,
            'status' => $this->faker->boolean(80), // 80% probabilidad de estar activo
            'web' => $this->faker->boolean(60), // 60% probabilidad de estar disponible en web
            'observaciones' => $this->faker->boolean(30) ? $this->faker->paragraph() : null,
        ];
    }
}