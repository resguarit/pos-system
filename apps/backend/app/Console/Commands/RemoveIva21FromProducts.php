<?php

namespace App\Console\Commands;

use App\Models\Iva;
use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class RemoveIva21FromProducts extends Command
{
    protected $signature = 'products:remove-iva-21
                            {--dry-run : Muestra el impacto sin guardar cambios}
                            {--batch=500 : Procesar en lotes de N productos}
                            {--recalculate-markup : Recalcula markup para que el precio automatico (sin sale_price manual) coincida con el precio actual}
                            {--force : Ejecuta sin confirmacion interactiva}';

    protected $description = 'Setea IVA 0% en todos los productos manteniendo exactamente el precio de venta actual (fija sale_price manual)';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');
        $batchSize = max(1, (int) $this->option('batch'));
        $recalculateMarkup = (bool) $this->option('recalculate-markup');

        // Buscar IVA 0% de forma tolerante a decimales/DB drivers
        $iva0 = Iva::withTrashed()
            ->whereBetween('rate', [-0.0001, 0.0001])
            ->first();

        if (!$iva0) {
            // Algunas bases no tienen ejecutado el seeder de IVA; intentamos crearlo.
            try {
                $iva0 = Iva::create(['rate' => 0.00]);
            } catch (Throwable $e) {
                // Si ya existe (race/unique), lo buscamos de nuevo.
                $iva0 = Iva::withTrashed()
                    ->whereBetween('rate', [-0.0001, 0.0001])
                    ->first();
                if (!$iva0) {
                    throw $e;
                }
            }
        }

        if ($iva0->trashed()) {
            $iva0->restore();
        }

        $totalProducts = Product::query()->count();
        if ($totalProducts === 0) {
            $this->warn('No hay productos para procesar.');
            return self::SUCCESS;
        }

        $alreadyWithIva0 = Product::query()->where('iva_id', $iva0->id)->count();

        $this->info('Se aplicara IVA 0% a todos los productos conservando exactamente el precio de venta actual.');
        $this->line("Productos totales: {$totalProducts}");
        $this->line("Ya en IVA 0: {$alreadyWithIva0}");
        $this->line("Batch size: {$batchSize}");
        $this->line('Recalcular markup: ' . ($recalculateMarkup ? 'SI' : 'NO'));
        if ($dryRun) {
            $this->comment('Modo dry-run activo: no se guardaran cambios.');
        }

        if (!$dryRun && !$force && !$this->confirm('Esta accion actualizara productos en base de datos. Desea continuar?')) {
            $this->warn('Operacion cancelada por el usuario.');
            return self::SUCCESS;
        }

        $processed = 0;
        $updated = 0;
        $manualSalePriceSet = 0;
        $markupRecalculated = 0;
        $examplesShown = 0;

        $work = function () use (
            $iva0,
            $batchSize,
            $dryRun,
            $recalculateMarkup,
            &$processed,
            &$updated,
            &$manualSalePriceSet,
            &$markupRecalculated,
            &$examplesShown
        ): void {
            Product::query()
                ->orderBy('id')
                ->chunkById($batchSize, function ($products) use (
                    $iva0,
                    $dryRun,
                    $recalculateMarkup,
                    &$processed,
                    &$updated,
                    &$manualSalePriceSet,
                    &$markupRecalculated,
                    &$examplesShown
                ): void {
                    foreach ($products as $product) {
                        $processed++;

                        // Captura el precio de venta visible actual (manual o calculado)
                        // para preservarlo al cambiar el IVA.
                        $currentVisibleSalePrice = (float) $product->sale_price;

                        $updates = [
                            'iva_id' => $iva0->id,
                            'sale_price' => $currentVisibleSalePrice,
                        ];

                        $newMarkup = null;
                        if ($recalculateMarkup) {
                            // Con IVA 0% y este markup, el precio automático (si se borra sale_price) debería volver
                            // a coincidir con $currentVisibleSalePrice.
                            $product->iva_id = $iva0->id;
                            $newMarkup = (float) $product->calculateMarkupFromSalePrice($currentVisibleSalePrice);
                            $updates['markup'] = $newMarkup;
                        }

                        if ($examplesShown < 5) {
                            $this->line('');
                            $this->line("Producto {$product->id} ({$product->code}) {$product->description}");
                            $this->line("  iva_id: {$product->iva_id} -> {$iva0->id} (IVA 0%)");
                            $this->line('  sale_price (visible) antes: ' . number_format($currentVisibleSalePrice, 2, '.', ''));
                            $this->line('  sale_price (manual) nuevo: ' . number_format((float) $updates['sale_price'], 2, '.', ''));
                            if ($recalculateMarkup) {
                                $this->line('  markup nuevo: ' . number_format((float) $newMarkup, 4, '.', ''));
                            }
                            $examplesShown++;
                        }

                        if ($dryRun) {
                            continue;
                        }

                        $product->forceFill($updates)->saveQuietly();
                        $updated++;
                        $manualSalePriceSet++;
                        if ($recalculateMarkup) {
                            $markupRecalculated++;
                        }
                    }
                });
        };

        if ($dryRun) {
            $work();
        } else {
            DB::transaction(fn () => $work());
        }

        $this->line('');
        $this->info('Proceso finalizado.');
        $this->line("Procesados: {$processed}");
        $this->line("Actualizados: {$updated}");
        $this->line("Con sale_price manual seteado: {$manualSalePriceSet}");
        if ($recalculateMarkup) {
            $this->line("Con markup recalculado: {$markupRecalculated}");
        }

        return self::SUCCESS;
    }
}

