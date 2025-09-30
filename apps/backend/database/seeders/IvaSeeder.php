<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Iva;

class IvaSeeder extends Seeder
{
    public function run(): void
    {
        $ivaRates = [
            ['rate' => 0.00],
            ['rate' => 10.50],
            ['rate' => 21.00],
            ['rate' => 27.00],
        ];

        foreach ($ivaRates as $iva) {
            Iva::updateOrCreate($iva);
        }
    }
}
