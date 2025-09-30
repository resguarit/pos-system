<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ExchangeRate;
use Carbon\Carbon;

class ExchangeRateSeeder extends Seeder
{
    public function run()
    {
        // Tasa USD a ARS (ejemplo: 1 USD = 1000 ARS)
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'ARS',
            'rate' => 1000.00,
            'is_active' => true,
            'effective_date' => Carbon::now(),
        ]);

        // Tasa ARS a USD (ejemplo: 1 ARS = 0.001 USD)
        ExchangeRate::create([
            'from_currency' => 'ARS',
            'to_currency' => 'USD',
            'rate' => 0.001,
            'is_active' => true,
            'effective_date' => Carbon::now(),
        ]);
    }
}
