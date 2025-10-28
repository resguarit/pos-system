<?php

namespace Database\Factories;

use App\Models\Combo;
use App\Models\Product;
use App\Models\ComboItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class ComboFactory extends Factory
{
    protected $model = Combo::class;

    public function definition()
    {
        return [
            'name' => $this->faker->words(2, true) . ' Combo',
            'description' => $this->faker->sentence(),
            'discount_type' => $this->faker->randomElement(['percentage', 'fixed_amount']),
            'discount_value' => $this->faker->randomFloat(2, 5, 50),
            'is_active' => true,
            'notes' => $this->faker->optional()->paragraph(),
        ];
    }

    public function withProducts(int $count = 3)
    {
        return $this->afterCreating(function (Combo $combo) use ($count) {
            $products = Product::factory()->count($count)->create();
            
            foreach ($products as $product) {
                ComboItem::create([
                    'combo_id' => $combo->id,
                    'product_id' => $product->id,
                    'quantity' => $this->faker->randomFloat(3, 0.5, 3),
                ]);
            }
        });
    }

    public function inactive()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => false,
            ];
        });
    }

    public function withPercentageDiscount(float $percentage = 10)
    {
        return $this->state(function (array $attributes) use ($percentage) {
            return [
                'discount_type' => 'percentage',
                'discount_value' => $percentage,
            ];
        });
    }

    public function withFixedDiscount(float $amount = 50)
    {
        return $this->state(function (array $attributes) use ($amount) {
            return [
                'discount_type' => 'fixed_amount',
                'discount_value' => $amount,
            ];
        });
    }
}




