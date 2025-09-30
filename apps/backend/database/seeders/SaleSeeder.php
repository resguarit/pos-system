<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SaleHeader;

class SaleSeeder extends Seeder
{
    public function run(): void
    {
        SaleHeader::factory(10)->create();
    }
}
