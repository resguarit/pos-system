<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\CurrentAccountMovement;
use App\Models\SaleHeader;
use Illuminate\Support\Facades\DB;

class FixDuplicateAccountMovements extends Command
{
    protected $signature = 'current-accounts:fix-duplicate-movements {--dry-run : Solo mostrar qué se haría sin hacer cambios}';
    protected $description = 'Encontrar y corregir movimientos duplicados de cuenta corriente para la misma venta';

    public function handle()
    {
        $dryRun = $this->option('dry-run');
        
        if ($dryRun) {
            $this->warn('🔍 MODO DRY-RUN: Solo se mostrarán los cambios, no se aplicarán.');
            $this->newLine();
        }

        $this->info('🔍 Buscando movimientos duplicados de cuenta corriente...');
        $this->newLine();

        // Buscar movimientos duplicados: mismo sale_id, mismo movement_type_id, misma current_account_id
        $duplicates = DB::table('current_account_movements')
            ->select('sale_id', 'movement_type_id', 'current_account_id', DB::raw('COUNT(*) as count'))
            ->whereNotNull('sale_id')
            ->whereNull('deleted_at')
            ->groupBy('sale_id', 'movement_type_id', 'current_account_id')
            ->having('count', '>', 1)
            ->get();

        if ($duplicates->isEmpty()) {
            $this->info('✅ No se encontraron movimientos duplicados.');
            return 0;
        }

        $this->warn("⚠️  Se encontraron {$duplicates->count()} grupos de movimientos duplicados:");
        $this->newLine();

        $totalToDelete = 0;
        $movementsToDelete = [];

        foreach ($duplicates as $duplicate) {
            $movements = CurrentAccountMovement::where('sale_id', $duplicate->sale_id)
                ->where('movement_type_id', $duplicate->movement_type_id)
                ->where('current_account_id', $duplicate->current_account_id)
                ->whereNull('deleted_at')
                ->orderBy('id', 'asc')
                ->get();

            $sale = SaleHeader::find($duplicate->sale_id);
            $saleNumber = $sale ? $sale->receipt_number : 'N/A';
            $movementType = $movements->first()->movementType;

            $this->line("📋 Venta #{$saleNumber} (ID: {$duplicate->sale_id}) | Tipo: {$movementType->name}");
            $this->line("   Cantidad de movimientos duplicados: {$duplicate->count}");
            $this->newLine();

            $this->table(
                ['ID Movimiento', 'Monto', 'Balance Antes', 'Balance Después', 'Fecha', 'Descripción'],
                $movements->map(function ($movement) {
                    return [
                        $movement->id,
                        '$' . number_format($movement->amount, 2, ',', '.'),
                        '$' . number_format($movement->balance_before, 2, ',', '.'),
                        '$' . number_format($movement->balance_after, 2, ',', '.'),
                        $movement->movement_date ? $movement->movement_date->format('Y-m-d H:i') : '-',
                        substr($movement->description, 0, 40) . '...'
                    ];
                })->toArray()
            );

            // Mantener el primero (más antiguo), eliminar los demás
            $firstMovement = $movements->first();
            $toDelete = $movements->skip(1);

            $this->line("   ✅ Mantener movimiento ID: {$firstMovement->id} (más antiguo)");
            foreach ($toDelete as $movement) {
                $this->line("   ❌ Eliminar movimiento ID: {$movement->id}");
                $movementsToDelete[] = $movement->id;
                $totalToDelete++;
            }

            $this->newLine();
        }

        $this->info("📊 Total de movimientos a eliminar: {$totalToDelete}");
        $this->newLine();

        if ($dryRun) {
            $this->comment('💡 Ejecuta sin --dry-run para aplicar los cambios.');
            $this->comment('   Ejemplo: php artisan current-accounts:fix-duplicate-movements');
            return 0;
        }

        if (!$this->confirm('⚠️  ¿Desea eliminar estos movimientos duplicados?', false)) {
            $this->info('Operación cancelada.');
            return 0;
        }

        return $this->deleteDuplicates($movementsToDelete);
    }

    private function deleteDuplicates(array $movementIds): int
    {
        $this->info('🗑️  Eliminando movimientos duplicados...');
        $this->newLine();

        DB::beginTransaction();

        try {
            $deleted = CurrentAccountMovement::whereIn('id', $movementIds)->delete();
            
            DB::commit();
            
            $this->info("✅ {$deleted} movimientos duplicados eliminados correctamente.");
            $this->newLine();
            $this->comment('⚠️  IMPORTANTE: Después de eliminar movimientos, es necesario recalcular los balances de las cuentas corrientes.');
            $this->comment('   Ejecuta: php artisan current-accounts:recalculate-balances (si existe)');
            
            return 0;

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("❌ Error al eliminar movimientos: " . $e->getMessage());
            return 1;
        }
    }
}




