<?php

namespace Database\Factories;

use App\Models\Iva;
use Illuminate\Database\Eloquent\Factories\Factory;

class IvaFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = Iva::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        $ivaRates = [0.00, 10.50, 21.00, 27.00];
        
        return [
            'rate' => $this->faker->unique()->randomElement($ivaRates),
        ];
    }
}