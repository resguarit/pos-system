<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class CashMovementSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_AR');
        
        $cashRegisterIds = DB::table('cash_registers')->pluck('id');
        $movementTypeIds = DB::table('movement_types')
            ->where('is_cash_movement', true)
            ->pluck('id');
        
        $records = [];
        
        foreach ($cashRegisterIds as $cashRegisterId) {
            // Cada caja tiene entre 3 y 10 movimientos
            $numMovements = rand(3, 10);
            
            for ($i = 0; $i < $numMovements; $i++) {
                $movementTypeId = $faker->randomElement($movementTypeIds);
                $movementType = DB::table('movement_types')->find($movementTypeId);
                
                // Determinar el monto según el tipo de operación
                if ($movementType->operation_type === 'entrada') {
                    $amount = $faker->randomFloat(2, 100, 5000);
                } else {
                    $amount = $faker->randomFloat(2, 50, 2000);
                }
                
                $description = '';
                
                // Si es venta en efectivo, usar descripción específica
                if ($movementType->name === 'Venta en efectivo') {
                    $saleId = $faker->numberBetween(1, 100); // Generar ID de venta ficticio
                    $description = 'Venta #' . $saleId;
                } else {
                    $description = $faker->sentence(6);
                }
                
                $records[] = [
                    'cash_register_id' => $cashRegisterId,
                    'movement_type_id' => $movementTypeId,
                    'amount' => $amount,
                    'description' => $description,
                    'metadata' => json_encode([
                        'user' => $faker->name(),
                        'method' => $faker->randomElement(['efectivo', 'transferencia', 'cheque'])
                    ]),
                    'created_at' => $faker->dateTimeBetween('-30 days', 'now'),
                    'updated_at' => now(),
                ];
            }
        }
        
        DB::table('cash_movements')->insert($records);
    }
}
