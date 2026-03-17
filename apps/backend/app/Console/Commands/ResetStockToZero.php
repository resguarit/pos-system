<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Stock;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;

class ResetStockToZero extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'stock:reset-to-zero';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset all product stock to 0 across all branches';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        if (!$this->confirm('¿Estás seguro de que deseas poner TODO el stock actual a 0? Esta acción no se puede deshacer.')) {
            $this->info('Operación cancelada.');
            return;
        }

        $this->info('Borrando stock...');

        DB::beginTransaction();

        try {
            $stocksToReset = Stock::where('current_stock', '!=', 0)->get();
            $count = 0;

            foreach ($stocksToReset as $stock) {
                $oldQuantity = $stock->current_stock;

                // Registrar el movimiento de stock para la auditoría
                StockMovement::create([
                    'product_id' => $stock->product_id,
                    'branch_id' => $stock->branch_id,
                    'quantity' => -$oldQuantity,
                    'type' => 'ajuste', // Tipo de ajuste
                    'reference_type' => 'App\Models\User', // O puede ser nulo dependiendo de tu validación
                    'reference_id' => 1, // Usuario administrador
                    'current_stock_balance' => 0,
                    'notes' => 'Reseteo automático de stock a 0'
                ]);

                // Actualizar a 0
                $stock->update(['current_stock' => 0]);
                $count++;
            }

            DB::commit();

            $this->info("¡Éxito! Se ha reseteado el stock a 0 para {$count} registros.");
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Error al resetear el stock: ' . $e->getMessage());
        }
    }
}
