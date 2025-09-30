<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\FiscalCondition;

class FiscalConditionSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            ['name' => 'Responsable Inscripto'],
            ['name' => 'Monotributista'],
            ['name' => 'Consumidor Final'],
            ['name' => 'Exento'],
        ];
        
        foreach ($data as $item) {
            FiscalCondition::firstOrCreate($item);
        }
    }
}
