<?php

namespace App\Console\Commands;

use App\Constants\AfipConstants;
use App\Constants\SaleNumberingScope;
use App\Models\ReceiptType;
use App\Models\SaleHeader;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Normaliza el historial de ventas a numeración contigua por sucursal.
 *
 * Todas las ventas no-presupuesto de cada sucursal se reasignan a numbering_scope = 'sale'
 * y receipt_number = 1, 2, 3... ordenadas por date e id. Así todas las ventas (fiscales y no fiscales)
 * quedan en una sola secuencia; los presupuestos no se tocan.
 *
 * ADVERTENCIA: Cambia receipt_number de ventas existentes. Si tenés referencias externas,
 * AFIP o reportes que usen el número viejo, revisá antes de ejecutar.
 */
class NormalizeSaleNumberingScope extends Command
{
    protected $signature = 'sales:normalize-numbering-scope
                            {--branch= : Solo esta sucursal (branch_id)}
                            {--dry-run : Mostrar qué se haría sin modificar}
                            {--force : No pedir confirmación}';

    protected $description = 'Normaliza numbering_scope a una sola secuencia "sale" por sucursal (renumera ventas no-presupuesto)';

    public function handle(): int
    {
        $branchId = $this->option('branch') ? (int) $this->option('branch') : null;
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');

        $presupuestoTypeIds = ReceiptType::where('afip_code', AfipConstants::RECEIPT_CODE_PRESUPUESTO)
            ->pluck('id')
            ->all();

        $query = SaleHeader::query()
            ->whereNotIn('receipt_type_id', $presupuestoTypeIds)
            ->orderBy('branch_id')
            ->orderBy('date')
            ->orderBy('id');

        if ($branchId !== null) {
            $query->where('branch_id', $branchId);
        }

        $allSales = $query->get();
        if ($allSales->isEmpty()) {
            $this->info('No hay ventas no-presupuesto. Nada que normalizar.');
            return 0;
        }

        $byBranch = $allSales->groupBy('branch_id');
        $this->table(
            ['Sucursal', 'Ventas a renumerar (1, 2, 3... por fecha)'],
            $byBranch->map(fn ($sales, $bid) => [$bid, $sales->count()])->values()->toArray()
        );
        $this->warn('Se va a asignar numbering_scope = "sale" y receipt_number = 1, 2, 3... por sucursal (orden: date, id).');
        if (! $dryRun && ! $force && ! $this->confirm('¿Continuar?', false)) {
            $this->info('Cancelado.');
            return 0;
        }

        if ($dryRun) {
            $this->info('[DRY-RUN] No se modificó nada.');
            return 0;
        }

        $driver = DB::getDriverName();
        if ($driver !== 'mysql') {
            $this->error('Este comando está pensado para MySQL. Abortando.');
            return 1;
        }

        $indexName = 'unique_receipt_per_branch_scope';
        $hasIndex = ! empty(DB::select("SHOW INDEX FROM sales_header WHERE Key_name = ?", [$indexName]));
        if ($hasIndex) {
            DB::statement('ALTER TABLE sales_header DROP INDEX ' . $indexName);
        }

        try {
            foreach ($byBranch as $bid => $sales) {
                $next = 1;
                $ordered = $sales->sortBy(function ($s) {
                    $dateKey = $s->date ? $s->date->format('Y-m-d H:i:s') : '0000-00-00 00:00:00';
                    return $dateKey . '-' . str_pad((string) $s->id, 10, '0', STR_PAD_LEFT);
                })->values();
                foreach ($ordered as $sale) {
                    $newNumber = str_pad((string) $next, 8, '0', STR_PAD_LEFT);
                    $sale->receipt_number = $newNumber;
                    $sale->numbering_scope = SaleNumberingScope::SALE;
                    $sale->save();
                    if ($next <= 3 || $next > $sales->count() - 2) {
                        $this->line("  Sucursal {$bid} – Venta id={$sale->id} → {$newNumber}");
                    } elseif ($next === 4) {
                        $this->line('  ...');
                    }
                    $next++;
                }
            }

            if ($hasIndex) {
                DB::statement('ALTER TABLE sales_header ADD UNIQUE KEY unique_receipt_per_branch_scope (branch_id, numbering_scope, receipt_number)');
            }
            $this->info('Normalización completada.');
        } catch (\Throwable $e) {
            if ($hasIndex) {
                DB::statement('ALTER TABLE sales_header ADD UNIQUE KEY unique_receipt_per_branch_scope (branch_id, numbering_scope, receipt_number)');
            }
            $this->error('Error: ' . $e->getMessage());
            return 1;
        }

        return 0;
    }
}
