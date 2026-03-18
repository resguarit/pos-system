<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Branch;
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
        // 1. Obtener sucursales
        $branches = Branch::all();
        $branchOptions = $branches->pluck('description', 'id')->toArray();
        $options = ['all' => 'Todas las sucursales'] + $branchOptions;

        // 2. Selección de sucursal
        $selectedKey = $this->choice(
            '¿De qué sucursal deseas resetear el stock?',
            array_values($options),
            0
        );

        $selectedBranchId = array_search($selectedKey, $options);

        // 3. Confirmación
        $targetText = ($selectedBranchId === 'all') ? 'TODO el stock de TODAS las sucursales' : "todo el stock de la sucursal '$selectedKey'";

        if (!$this->confirm("¿Estás seguro de que deseas poner $targetText a 0? Esta acción no se puede deshacer.")) {
            $this->info('Operación cancelada.');
            return;
        }

        $this->info('Borrando stock...');

        DB::beginTransaction();

        try {
            $query = Stock::where('current_stock', '!=', 0);

            if ($selectedBranchId !== 'all') {
                $query->where('branch_id', $selectedBranchId);
            }

            $stocksToReset = $query->get();
            $count = 0;

            foreach ($stocksToReset as $stock) {
                $oldQuantity = $stock->current_stock;

                // Registrar el movimiento de stock para la auditoría
                StockMovement::create([
                    'product_id' => $stock->product_id,
                    'branch_id' => $stock->branch_id,
                    'quantity' => -$oldQuantity,
                    'type' => 'ajuste',
                    'reference_type' => 'App\Models\User',
                    'reference_id' => 1, // Usuario administrador
                    'current_stock_balance' => 0,
                    'notes' => 'Reseteo automático de stock a 0' . ($selectedBranchId === 'all' ? ' (Todas las sucursales)' : " (Sucursal: $selectedKey)")
                ]);

                // Actualizar a 0
                $stock->update(['current_stock' => 0]);
                $count++;
            }

            DB::commit();

            $this->info("¡Éxito! Se ha reseteado el stock a 0 para {$count} registros" . ($selectedBranchId === 'all' ? ' en todas las sucursales.' : " en $selectedKey."));
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Error al resetear el stock: ' . $e->getMessage());
        }
    }
}
