<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;
use Carbon\Carbon;

class CashRegisterSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_AR');
        
        $userIds = DB::table('users')->pluck('id');
        $branchIds = DB::table('branches')->pluck('id');
        
        $records = [];
        
        // Crear 5 registros de caja (algunos abiertos, algunos cerrados)
        for ($i = 0; $i < 5; $i++) {
            $isOpen = $faker->boolean(40); // 40% probabilidad de estar abierta
            $openedAt = $faker->dateTimeBetween('-30 days', '-1 day');
            $initialAmount = $faker->randomFloat(2, 1000, 5000);
            $closedAt = $isOpen ? null : $faker->dateTimeBetween($openedAt, 'now');
            $finalAmount = $isOpen ? null : $faker->randomFloat(2, $initialAmount, $initialAmount + 10000);
            
            $records[] = [
                'user_id' => $faker->randomElement($userIds),
                'branch_id' => $faker->randomElement($branchIds),
                'initial_amount' => $initialAmount,
                'final_amount' => $finalAmount,
                'opened_at' => $openedAt,
                'closed_at' => $closedAt,
                'status' => $isOpen ? 'open' : 'closed',
                'notes' => $faker->optional(0.5)->sentence(),
                'created_at' => $openedAt,
                'updated_at' => $closedAt ?? $openedAt,
            ];
        }
        
        DB::table('cash_registers')->insert($records);
    }
}
