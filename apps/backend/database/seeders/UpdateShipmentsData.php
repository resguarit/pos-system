<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UpdateShipmentsData extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('shipments')->whereNull('shipping_address')->update([
            'shipping_address' => '167 676',
            'shipping_city' => 'La Plata',
            'shipping_state' => 'Buenos Aires',
            'shipping_postal_code' => '1900',
            'shipping_country' => 'Argentina',
            'priority' => 'normal'
        ]);
        
        echo "Shipments updated successfully\n";
    }
}

