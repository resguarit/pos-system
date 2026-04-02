<?php

namespace App\Console\Commands;

use App\Models\Iva;
use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RemoveIva21FromProducts extends Command
{
    protected $signature = 'products:remove-iva-21
                            {--dry-run : Muestra el impacto sin guardar cambios}
                            {--batch=500 : Procesar en lotes de N productos}
                            {--force : Ejecuta sin confirmacion interactiva}';

    protected $description = 'Saca IVA 21% de los productos: pone iva_id en NULL y ajusta sale_price manual (con IVA -> sin IVA)';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');
        $batchSize = max(1, (int) $this->option('batch'));

        $iva21 = Iva::query()->where('rate', 21)->first();
        if (!$iva21) {
            $this->error('No se encontro un registro de IVA con rate=21.');
            $this->line('Tip: ejecuta los seeders de IVA y vuelve a intentar.');
            return self::FAILURE;
        }

        $totalWithIva21 = Product::query()->where('iva_id', $iva21->id)->count();
        if ($totalWithIva21 === 0) {
            $this->warn('No hay productos con IVA 21% para procesar.');
            return self::SUCCESS;
        }

        $this->info('Se quitara IVA 21% de los productos con IVA 21%.');
        $this->line("Productos con IVA 21: {$totalWithIva21}");
        $this->line("Batch size: {$batchSize}");
        if ($dryRun) {
            $this->comment('Modo dry-run activo: no se guardaran cambios.');
        }

        if (!$dryRun && !$force && !$this->confirm('Esta accion actualizara productos en base de datos. Desea continuar?')) {
            $this->warn('Operacion cancelada por el usuario.');
            return self::SUCCESS;
        }

        $processed = 0;
        $updated = 0;
        $manualAdjusted = 0;
        $examplesShown = 0;

        $work = function () use (
            $iva21,
            $batchSize,
            $dryRun,
            &$processed,
            &$updated,
            &$manualAdjusted,
            &$examplesShown
        ): void {
            Product::query()
                ->where('iva_id', $iva21->id)
                ->orderBy('id')
                ->chunkById($batchSize, function ($products) use (
                    $dryRun,
                    &$processed,
                    &$updated,
                    &$manualAdjusted,
                    &$examplesShown
                ): void {
                    foreach ($products as $product) {
                        $processed++;

                        $rawManualSalePrice = (float) ($product->getRawOriginal('sale_price') ?? 0);
                        $hasManualSalePrice = $rawManualSalePrice > 0;

                        $updates = [
                            'iva_id' => null,
                        ];

                        if ($hasManualSalePrice) {
                            $newSalePrice = round($rawManualSalePrice / 1.21, 2);
                            $updates['sale_price'] = $newSalePrice;
                        }

                        if ($examplesShown < 5) {
                            $this->line('');
                            $this->line("Producto {$product->id} ({$product->code}) {$product->description}");
                            $this->line("  iva_id: {$product->iva_id} -> NULL");
                            if ($hasManualSalePrice) {
                                $this->line('  sale_price (manual) antes: ' . number_format($rawManualSalePrice, 2, '.', ''));
                                $this->line('  sale_price (manual) nuevo: ' . number_format((float) $updates['sale_price'], 2, '.', ''));
                            } else {
                                $this->line('  sale_price: (auto) sin cambio (seguira calculado sin IVA)');
                            }
                            $examplesShown++;
                        }

                        if ($dryRun) {
                            continue;
                        }

                        $product->forceFill($updates)->saveQuietly();
                        $updated++;
                        if ($hasManualSalePrice) {
                            $manualAdjusted++;
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
        $this->line("Con sale_price manual ajustado: {$manualAdjusted}");

        return self::SUCCESS;
    }
}

