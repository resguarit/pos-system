<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class SalePaymentSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_AR');
        $saleIds = DB::table('sales_header')->pluck('id');
        $paymentMethodIds = DB::table('payment_methods')->pluck('id');
        $records = [];
        foreach ($saleIds as $saleId) {
            $numPayments = rand(1, 2);
            for ($i = 0; $i < $numPayments; $i++) {
                $paymentMethodId = $faker->randomElement($paymentMethodIds);
                $amount = $faker->randomFloat(2, 100, 10000);
                $records[] = [
                    'sale_header_id' => $saleId,
                    'payment_method_id' => $paymentMethodId,
                    'amount' => $amount,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }
        DB::table('sale_payments')->insert($records);
    }
}
