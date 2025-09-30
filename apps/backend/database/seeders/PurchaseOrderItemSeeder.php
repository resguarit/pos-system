<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class PurchaseOrderItemSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_AR');
        
        $purchaseOrderIds = DB::table('purchase_orders')->pluck('id');
        $productIds = DB::table('products')->pluck('id');
        
        $records = [];
        
        foreach ($purchaseOrderIds as $purchaseOrderId) {
            // Cada orden de compra tiene entre 1 y 5 productos
            $numItems = rand(1, 5);
            $usedProducts = [];
            
            for ($i = 0; $i < $numItems; $i++) {
                // Evitar productos duplicados en la misma orden
                do {
                    $productId = $faker->randomElement($productIds);
                } while (in_array($productId, $usedProducts));
                
                $usedProducts[] = $productId;
                
                $quantity = rand(1, 50);
                $purchasePrice = $faker->randomFloat(2, 10, 500);
                $subtotal = $quantity * $purchasePrice;
                
                $records[] = [
                    'purchase_order_id' => $purchaseOrderId,
                    'product_id' => $productId,
                    'quantity' => $quantity,
                    'purchase_price' => $purchasePrice,
                    'subtotal' => $subtotal,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }
        
        DB::table('purchase_order_items')->insert($records);
    }
}
