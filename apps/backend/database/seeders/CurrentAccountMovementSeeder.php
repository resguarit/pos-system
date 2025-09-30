<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Factory as Faker;

class CurrentAccountMovementSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_AR');
        
        $currentAccounts = DB::table('current_accounts')->get();
        $movementTypeIds = DB::table('movement_types')
            ->where('is_current_account_movement', true)
            ->pluck('id');
        $saleIds = DB::table('sales_header')->pluck('id');
        
        $records = [];
        
        foreach ($currentAccounts as $account) {
            $currentBalance = 0;
            // Cada cuenta corriente tiene entre 2 y 8 movimientos
            $numMovements = rand(2, 8);
            
            for ($i = 0; $i < $numMovements; $i++) {
                $movementTypeId = $faker->randomElement($movementTypeIds);
                $movementType = DB::table('movement_types')->find($movementTypeId);
                
                $balanceBefore = $currentBalance;
                
                // Determinar el monto según el tipo de operación
                if ($movementType->operation_type === 'entrada') {
                    if ($movementType->name === 'Venta a crédito') {
                        $amount = $faker->randomFloat(2, 500, 5000);
                        $currentBalance += $amount; // Las ventas a crédito aumentan la deuda
                    } else { // Pago de cuenta corriente
                        $amount = $faker->randomFloat(2, 100, min(3000, abs($currentBalance)));
                        $currentBalance -= $amount; // Los pagos reducen la deuda
                    }
                } else {
                    $amount = $faker->randomFloat(2, 100, 2000);
                    $currentBalance += $amount;
                }
                
                $saleId = null;
                $description = '';
                
                if ($movementType->name === 'Venta a crédito') {
                    $saleId = $faker->randomElement($saleIds);
                    $description = 'Venta a crédito #' . $saleId;
                } elseif ($movementType->name === 'Pago de cuenta corriente') {
                    $description = 'Pago recibido - ' . $faker->randomElement(['Efectivo', 'Transferencia', 'Cheque']);
                } else {
                    $description = $faker->sentence(6);
                }
                
                $records[] = [
                    'current_account_id' => $account->id,
                    'movement_type_id' => $movementTypeId,
                    'amount' => $amount,
                    'description' => $description,
                    'reference' => $faker->optional(0.6)->bothify('CC-####'),
                    'sale_id' => $saleId,
                    'balance_before' => $balanceBefore,
                    'balance_after' => $currentBalance,
                    'metadata' => json_encode([
                        'method' => $faker->randomElement(['efectivo', 'transferencia', 'cheque', 'credito']),
                        'authorized_by' => $faker->name()
                    ]),
                    'created_at' => $faker->dateTimeBetween('-60 days', 'now'),
                    'updated_at' => now(),
                ];
            }
            
            // Actualizar el balance final en la cuenta corriente
            DB::table('current_accounts')
                ->where('id', $account->id)
                ->update(['current_balance' => $currentBalance]);
        }
        
        DB::table('current_account_movements')->insert($records);
    }
}
