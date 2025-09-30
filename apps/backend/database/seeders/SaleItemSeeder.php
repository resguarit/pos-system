<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Faker\Factory as Faker;

class SaleItemSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_AR');
        $saleIds = DB::table('sales_header')->pluck('id');
        $productIds = DB::table('products')->pluck('id');
        $items = [];
        foreach ($saleIds as $saleId) {
            $numItems = rand(1, 5);
            for ($i = 0; $i < $numItems; $i++) {
                $productId = $faker->randomElement($productIds);
                $quantity = $faker->randomFloat(2, 1, 10);
                $unitPrice = $faker->randomFloat(2, 100, 10000);
                $ivaRate = $faker->randomElement([0, 10.5, 21]);
                $itemSubtotal = $quantity * $unitPrice;
                $itemIva = $itemSubtotal * ($ivaRate / 100);
                $itemTotal = $itemSubtotal + $itemIva;
                $items[] = [
                    'sale_header_id' => $saleId,
                    'product_id' => $productId,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'iva_rate' => $ivaRate,
                    'item_subtotal' => $itemSubtotal,
                    'item_iva' => $itemIva,
                    'item_total' => $itemTotal,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }
        DB::table('sale_items')->insert($items);
    }
}
