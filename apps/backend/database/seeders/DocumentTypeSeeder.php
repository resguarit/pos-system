<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\DocumentType;

class DocumentTypeSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            ['name' => 'DNI', 'code' => '96'],
            ['name' => 'CUIT', 'code' => '80'],
            ['name' => 'CUIL', 'code' => '86'], // CUIL is 86 but commonly mapped.
            ['name' => 'Pasaporte', 'code' => '94'], // Pasaporte is 94
            ['name' => 'Sin Identificar', 'code' => '99'],
        ];
        foreach ($data as $item) {
            DocumentType::create($item);
        }
    }
}
