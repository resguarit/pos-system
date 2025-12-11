<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SaleHeader;
use App\Services\StockService;
use App\Services\SaleService;
use Illuminate\Support\Facades\DB;

class FixPendingSales extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sales:fix-pending {--dry-run : Si se activa, no realiza cambios en la base de datos}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Corrige ventas que quedaron en estado pending por error de permisos, actualizando a active y descontando stock.';

    protected $stockService;
    protected $saleService;

    public function __construct(StockService $stockService, SaleService $saleService)
    {
        parent::__construct();
        $this->stockService = $stockService;
        $this->saleService = $saleService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');

        $this->info('🔍 Buscando ventas en estado pending que no sean presupuestos...');

        // Buscar ventas pending que NO sean presupuestos (afip_code 016)
        $sales = SaleHeader::where('status', 'pending')
            ->whereHas('receiptType', function ($query) {
                $query->where('afip_code', '!=', '016');
            })
            ->with(['items', 'receiptType', 'cashMovements'])
            ->get();

        if ($sales->isEmpty()) {
            $this->info('✅ No se encontraron ventas pendientes para corregir.');
            return;
        }

        $this->info("Found {$sales->count()} ventas pendientes.");

        foreach ($sales as $sale) {
            $this->line("------------------------------------------------");
            $this->info("Procesando Venta #{$sale->receipt_number} (ID: {$sale->id})");
            $this->line("Fecha: {$sale->date}");
            $this->line("Total: {$sale->total}");

            if ($dryRun) {
                $this->info("[DRY RUN] Se actualizaría a status 'active' y se descontaría stock.");
                continue;
            }

            DB::transaction(function () use ($sale) {
                // 1. Actualizar estado
                $sale->status = 'active';
                $sale->save();
                $this->info("✅ Estado actualizado a 'active'");

                // 2. Descontar stock
                foreach ($sale->items as $item) {
                    $this->stockService->reduceStockByProductAndBranch(
                        $item->product_id,
                        $sale->branch_id,
                        $item->quantity
                    );
                    $this->line("   - Stock descontado: Producto {$item->product_id} (Cant: {$item->quantity})");
                }

                // 3. Verificar y crear movimientos de caja si faltan
                if ($sale->cashMovements->isEmpty()) {
                    // Intentar registrar movimientos si no existen
                    // Usamos el cash_register_id original si está guardado en algún lado, o intentamos inferirlo
                    // Como fallback, usamos null y el servicio intentará buscar una caja abierta o fallará
                    // Pero para este fix, si no tenemos caja, quizás sea mejor solo loguear warning
                    try {
                        // Recuperar ID de caja de metadata si existe, o intentar registrar sin ID específico
                        $cashRegisterId = $sale->current_cash_register_id ?? null;

                        if ($cashRegisterId) {
                            $this->saleService->registerSaleMovementFromPayments($sale, $cashRegisterId);
                            $this->info("✅ Movimientos de caja registrados");
                        } else {
                            $this->warn("⚠️ No se pudo registrar movimiento de caja: ID de caja no encontrado en la venta.");
                        }
                    } catch (\Exception $e) {
                        $this->error("❌ Error al registrar movimientos de caja: " . $e->getMessage());
                    }
                } else {
                    $this->info("ℹ️ Movimientos de caja ya existen.");
                }
            });
        }

        $this->info('🎉 Proceso finalizado.');
    }
}
