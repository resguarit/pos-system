<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\MovementType;

/**
 * Seeder para tipos de movimiento MANUALES de cuentas corrientes.
 * 
 * IMPORTANTE: Este seeder solo incluye tipos de movimiento que se crean manualmente.
 * Los tipos automáticos como "Venta" y "Pago de venta" se crean automáticamente
 * por el sistema y NO deben estar aquí.
 */
class CurrentAccountMovementTypeSeeder extends Seeder
{
    public function run(): void
    {
        $movementTypes = [
            // Movimientos de entrada (créditos manuales)
            [
                'name' => 'Nota de crédito',
                'description' => 'Nota de crédito emitida por devolución o descuento',
                'operation_type' => 'entrada',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Ajuste a favor',
                'description' => 'Ajuste contable que beneficia al cliente y reduce su deuda',
                'operation_type' => 'entrada',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Bonificación',
                'description' => 'Bonificación otorgada al cliente',
                'operation_type' => 'entrada',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Depósito a cuenta',
                'description' => 'Depósito realizado directamente a la cuenta corriente',
                'operation_type' => 'entrada',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            
            // Movimientos de salida (débitos manuales)
            [
                'name' => 'Compra a crédito',
                'description' => 'Compra realizada por el cliente a crédito (registro manual)',
                'operation_type' => 'salida',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Nota de débito',
                'description' => 'Nota de débito por interés, comisiones o gastos',
                'operation_type' => 'salida',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Interés aplicado',
                'description' => 'Interés aplicado por mora o financiación',
                'operation_type' => 'salida',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Comisión aplicada',
                'description' => 'Comisión aplicada por servicios administrativos',
                'operation_type' => 'salida',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Ajuste en contra',
                'description' => 'Ajuste contable que perjudica al cliente y aumenta su deuda',
                'operation_type' => 'salida',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
            [
                'name' => 'Gastos administrativos',
                'description' => 'Gastos administrativos aplicados a la cuenta',
                'operation_type' => 'salida',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ],
        ];
        
        if ($this->command) {
            $this->command->info('Creando tipos de movimiento MANUALES para cuentas corrientes...');
        }
        
        $created = 0;
        $updated = 0;
        
        foreach ($movementTypes as $movementTypeData) {
            $movementType = MovementType::firstOrCreate(
                ['name' => $movementTypeData['name']],
                $movementTypeData
            );
            
            if ($movementType->wasRecentlyCreated) {
                $created++;
            } else {
                // Actualizar si ya existe pero puede haber cambiado
                $movementType->update($movementTypeData);
                $updated++;
            }
        }
        
        if ($this->command) {
            $this->command->info("✅ Tipos de movimiento creados: {$created}, actualizados: {$updated}");
        }
    }
}