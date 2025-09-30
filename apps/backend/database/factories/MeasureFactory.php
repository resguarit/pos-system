<?php

namespace Database\Factories;

use App\Models\Measure;
use Illuminate\Database\Eloquent\Factories\Factory;

class MeasureFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = Measure::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        $measures = ['Kg', 'Unidad', 'Litro', 'Metro', 'Gramo', 'Docena', 'Caja', 'Paquete'];
        
        return [
            'name' => $this->faker->unique()->randomElement($measures),
        ];
    }
}