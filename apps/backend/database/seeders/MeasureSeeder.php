<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Measure;

class MeasureSeeder extends Seeder
{
    public function run(): void
    {
        $measures = [
            ['name' => 'Unidad'],
            ['name' => 'Kilogramo'],
            ['name' => 'Gramo'],
            ['name' => 'Litro'],
            ['name' => 'Metro'],
            ['name' => 'Centímetro'],
            ['name' => 'Sin unidad'],
        ];

        foreach ($measures as $measure) {
            Measure::updateOrCreate(
                ['name' => $measure['name']], 
                $measure
            );
        }
    }
}
