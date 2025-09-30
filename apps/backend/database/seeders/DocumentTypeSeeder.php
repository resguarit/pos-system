<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\DocumentType;

class DocumentTypeSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            ['name' => 'DNI', 'code' => 'DNI'],
            ['name' => 'CUIT', 'code' => 'CUIT'],
            ['name' => 'CUIL', 'code' => 'CUIL'],
            ['name' => 'Pasaporte', 'code' => 'PAS'],
        ];
        foreach ($data as $item) {
            DocumentType::create($item);
        }
    }
}
