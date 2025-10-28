<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\CurrentAccount;
use App\Models\CurrentAccountMovement;
use App\Models\MovementType;
use App\Models\Customer;
use Faker\Factory as Faker;

class CurrentAccountSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_AR');
        
        // Obtener clientes existentes
        $customers = Customer::with('person')->get();
        
        if ($customers->isEmpty()) {
            $this->command->warn('No hay clientes disponibles para crear cuentas corrientes');
            return;
        }
        
        // Obtener tipos de movimiento para cuenta corriente
        $movementTypes = MovementType::where('is_current_account_movement', true)->get();
        
        if ($movementTypes->isEmpty()) {
            $this->command->warn('No hay tipos de movimiento para cuenta corriente disponibles');
            return;
        }
        
        $this->command->info('Creando cuentas corrientes...');
        
        foreach ($customers as $customer) {
            // Solo crear cuenta corriente para algunos clientes (70% de probabilidad)
            if ($faker->boolean(70)) {
                $creditLimit = $faker->randomFloat(2, 10000, 200000);
                $currentBalance = $faker->randomFloat(2, -$creditLimit * 0.3, $creditLimit * 0.2);
                $status = $faker->randomElement(['active', 'active', 'active', 'suspended']); // Más probabilidad de activas
                
                $account = CurrentAccount::updateOrCreate(
                    ['customer_id' => $customer->id],
                    [
                        'credit_limit' => $creditLimit,
                        'current_balance' => $currentBalance,
                        'status' => $status,
                        'notes' => $faker->optional(0.3)->sentence(),
                        'opened_at' => $faker->dateTimeBetween('-2 years', '-1 month'),
                    'closed_at' => $status === 'closed' ? $faker->dateTimeBetween('-6 months', 'now') : null,
                    'last_movement_at' => $faker->dateTimeBetween('-3 months', 'now'),
                ]);
                
                $this->command->info("Cuenta corriente creada para cliente: {$customer->person->full_name}");
                
                // Crear algunos movimientos históricos para la cuenta
                $this->createHistoricalMovements($account, $movementTypes, $faker);
            }
        }
        
        $this->command->info('Cuentas corrientes creadas exitosamente');
    }
    
    private function createHistoricalMovements(CurrentAccount $account, $movementTypes, $faker): void
    {
        $movementCount = $faker->numberBetween(5, 20);
        
        for ($i = 0; $i < $movementCount; $i++) {
            $movementType = $movementTypes->random();
            $amount = $faker->randomFloat(2, 100, 5000);
            
            // Determinar si es entrada o salida basado en el tipo de movimiento
            $isInflow = $movementType->operation_type === 'entrada';
            $balanceChange = $isInflow ? $amount : -$amount;
            
            $movementDate = $faker->dateTimeBetween($account->opened_at, 'now');
            
            CurrentAccountMovement::create([
                'current_account_id' => $account->id,
                'movement_type_id' => $movementType->id,
                'amount' => $amount,
                'description' => $this->generateMovementDescription($movementType->name, $faker),
                'reference' => $faker->optional(0.6)->numerify('REF-####'),
                'balance_before' => $account->current_balance,
                'balance_after' => $account->current_balance + $balanceChange,
                'metadata' => $faker->optional(0.2)->randomElements([
                    'payment_method' => $faker->randomElement(['cash', 'transfer', 'check']),
                    'branch_id' => $faker->numberBetween(1, 3),
                    'notes' => $faker->sentence()
                ]),
                'user_id' => null, // No asignar usuario específico por ahora
                'movement_date' => $movementDate,
            ]);
            
            // Actualizar el balance de la cuenta
            $account->current_balance += $balanceChange;
        }
        
        $account->save();
    }
    
    private function generateMovementDescription(string $movementTypeName, $faker): string
    {
        $descriptions = [
            'Pago de cuenta corriente' => [
                'Pago parcial de cuenta corriente',
                'Pago completo de cuenta corriente',
                'Pago mediante transferencia bancaria',
                'Pago en efectivo',
                'Pago mediante cheque'
            ],
            'Compra a crédito' => [
                'Compra de productos varios',
                'Compra de repuestos',
                'Compra de equipos',
                'Compra de servicios',
                'Compra de materiales'
            ],
            'Ajuste de cuenta' => [
                'Ajuste por diferencia de cambio',
                'Ajuste por error contable',
                'Ajuste por descuento aplicado',
                'Ajuste por interés aplicado',
                'Ajuste por comisión'
            ],
            'Nota de crédito' => [
                'Nota de crédito por devolución',
                'Nota de crédito por descuento',
                'Nota de crédito por bonificación',
                'Nota de crédito por error de facturación'
            ],
            'Nota de débito' => [
                'Nota de débito por interés',
                'Nota de débito por comisión',
                'Nota de débito por gastos administrativos',
                'Nota de débito por servicios adicionales'
            ]
        ];
        
        $typeDescriptions = $descriptions[$movementTypeName] ?? ['Movimiento de cuenta corriente'];
        
        return $faker->randomElement($typeDescriptions);
    }
}
