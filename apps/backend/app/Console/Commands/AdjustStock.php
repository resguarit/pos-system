<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Stock;
use Illuminate\Support\Facades\DB;

class AdjustStock extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'stock:adjust 
                            {--operation=halve : Operación a realizar (halve, double, set)}
                            {--value= : Valor específico para operación "set"}
                            {--product-id= : ID específico del producto (opcional)}
                            {--branch-id= : ID específico de la sucursal (opcional)}
                            {--dry-run : Solo mostrar qué se haría sin ejecutar}
                            {--batch=100 : Procesar en lotes de N registros}
                            {--force : Forzar ejecución sin confirmación}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ajusta el stock de productos (reducir a la mitad, duplicar, o establecer valor específico)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $operation = $this->option('operation');
        $value = $this->option('value');
        $productId = $this->option('product-id');
        $branchId = $this->option('branch-id');
        $dryRun = $this->option('dry-run');
        $batchSize = (int) $this->option('batch');
        $force = $this->option('force');

        // Validar operación
        if (!in_array($operation, ['halve', 'double', 'set'])) {
            $this->error('Operación inválida. Use: halve, double, o set');
            return 1;
        }

        if ($operation === 'set' && $value === null) {
            $this->error('Para la operación "set" debe especificar un valor con --value');
            return 1;
        }

        // Query base
        $query = Stock::query();
        
        if ($productId) {
            $query->where('product_id', $productId);
        }
        
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $totalStocks = $query->count();
        
        if ($totalStocks === 0) {
            $this->info('No hay registros de stock que coincidan con los criterios.');
            return 0;
        }

        $this->info("Procesando {$totalStocks} registros de stock...");
        $this->info("Operación: {$operation}");
        
        if ($dryRun) {
            $this->warn('MODO DRY-RUN: No se guardarán cambios');
        }

        // Mostrar algunos ejemplos
        $examples = $query->limit(5)->get();
        $this->info("\nEjemplos de registros a procesar:");
        foreach ($examples as $stock) {
            $newValue = $this->calculateNewValue($stock->current_stock, $operation, $value);
            $this->line("Producto {$stock->product_id} - Sucursal {$stock->branch_id}: {$stock->current_stock} → {$newValue}");
        }

        if (!$dryRun && !$force) {
            if (!$this->confirm("¿Continuar con la operación?")) {
                $this->info('Operación cancelada.');
                return 0;
            }
        }

        $bar = $this->output->createProgressBar($totalStocks);
        $bar->start();

        $processed = 0;
        $errors = 0;
        $updated = 0;

        $query->chunk($batchSize, function ($stocks) use ($operation, $value, $dryRun, $bar, &$processed, &$errors, &$updated) {
            foreach ($stocks as $stock) {
                try {
                    $oldStock = $stock->current_stock;
                    $newStock = $this->calculateNewValue($oldStock, $operation, $value);
                    
                    if (!$dryRun) {
                        $stock->update(['current_stock' => $newStock]);
                        $updated++;
                    }

                    $processed++;

                } catch (\Exception $e) {
                    $errors++;
                    $this->error("\nError en stock {$stock->id}: " . $e->getMessage());
                }

                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();
        
        $this->info("✅ Procesados: {$processed} registros");
        if ($errors > 0) {
            $this->error("❌ Errores: {$errors} registros");
        }
        
        if ($dryRun) {
            $this->warn('Ejecuta sin --dry-run para aplicar los cambios');
        } else {
            $this->info("🎉 Ajuste de stock completado! {$updated} registros actualizados.");
        }

        return 0;
    }

    /**
     * Calcula el nuevo valor según la operación
     */
    private function calculateNewValue($currentValue, $operation, $value = null)
    {
        switch ($operation) {
            case 'halve':
                return max(0, floor($currentValue / 2));
            case 'double':
                return $currentValue * 2;
            case 'set':
                return (int) $value;
            default:
                return $currentValue;
        }
    }
}