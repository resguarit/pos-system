<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\FiscalCondition;

class FiscalConditionSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            ['name' => 'Responsable Inscripto', 'afip_code' => '1'],
            ['name' => 'Monotributista', 'afip_code' => '6'],
            ['name' => 'Consumidor Final', 'afip_code' => '5'],
            ['name' => 'Exento', 'afip_code' => '4'],
        ];

        foreach ($data as $item) {
            FiscalCondition::updateOrCreate(
                ['name' => $item['name']],
                ['afip_code' => $item['afip_code']]
            );
        }
    }
}
