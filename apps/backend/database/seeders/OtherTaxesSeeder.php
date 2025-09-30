<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\OtherTax;

class OtherTaxesSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            ['afip_code' => '99', 'description' => 'Impuesto Interno'],
            ['afip_code' => '98', 'description' => 'Percepción IVA'],
        ];
        foreach ($data as $item) {
            OtherTax::updateOrCreate(['afip_code' => $item['afip_code']], $item);
        }
    }
}
