<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class CurrentAccountSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_AR');
        
        $customerIds = DB::table('customers')->pluck('id');
        
        $records = [];
        
        foreach ($customerIds as $customerId) {
            $creditLimit = $faker->randomFloat(2, 5000, 100000);
            $currentBalance = $faker->randomFloat(2, -$creditLimit/2, $creditLimit/4);
            
            $records[] = [
                'customer_id' => $customerId,
                'credit_limit' => $creditLimit,
                'current_balance' => $currentBalance,
                'status' => $faker->randomElement(['active', 'inactive', 'suspended']),
                'notes' => $faker->optional(0.4)->sentence(),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        
        DB::table('current_accounts')->insert($records);
    }
}
