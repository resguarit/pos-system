<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\PricingService;
use Illuminate\Console\Command;

class SyncProductMarkupFromSalePrice extends Command
{
    protected $signature = 'products:sync-markup-from-sale-price
                            {--tolerance=0.05 : Tolerancia en delta de markup decimal (0.05 = 5pp)}
                            {--limit=50 : Máximo de filas a mostrar}
                            {--batch=500 : Tamaño de lote para chunk()}
                            {--dry-run : Solo mostrar qué se haría sin guardar}
                            {--fix : Aplicar cambios (actualiza markup)}
                            {--ids= : IDs separados por coma para acotar (ej: 3,82,83)}';

    protected $description = 'Sincroniza markup almacenado con el markup implícito por sale_price (PricingService::calculateMarkup)';

    public function handle(PricingService $pricingService): int
    {
        $tolerance = (float) $this->option('tolerance');
        $limit = max(0, (int) $this->option('limit'));
        $batch = max(50, (int) $this->option('batch'));
        $dryRun = (bool) $this->option('dry-run');
        $fix = (bool) $this->option('fix');

        if ($fix && $dryRun) {
            $this->error('No uses --fix y --dry-run juntos.');
            return 1;
        }
        if (!$fix && !$dryRun) {
            $this->warn('No se hará nada sin --dry-run o --fix.');
            return 1;
        }

        $idsOpt = trim((string) $this->option('ids'));
        $ids = [];
        if ($idsOpt !== '') {
            $ids = array_values(array_filter(array_map(
                fn ($v) => (int) trim($v),
                explode(',', $idsOpt)
            ), fn ($v) => $v > 0));
        }

        $updated = 0;
        $checked = 0;
        $skippedNoSalePrice = 0;
        $skippedNoUnitPrice = 0;
        $skippedInvalid = 0;

        $rows = [];

        $query = Product::query()
            ->select(['id', 'code', 'description', 'unit_price', 'currency', 'markup', 'sale_price', 'iva_id'])
            ->orderBy('id');

        if (!empty($ids)) {
            $query->whereIn('id', $ids);
        }

        $query->chunk($batch, function ($products) use (
            $pricingService,
            $tolerance,
            $limit,
            $dryRun,
            $fix,
            &$updated,
            &$checked,
            &$skippedNoSalePrice,
            &$skippedNoUnitPrice,
            &$skippedInvalid,
            &$rows
        ) {
            foreach ($products as $product) {
                $unitPrice = (float) $product->getRawOriginal('unit_price');
                $salePriceRaw = $product->getRawOriginal('sale_price');
                $salePrice = $salePriceRaw === null ? null : (float) $salePriceRaw;
                $storedMarkup = (float) $product->getRawOriginal('markup');

                if ($unitPrice <= 0 || !is_finite($unitPrice)) {
                    $skippedNoUnitPrice++;
                    continue;
                }
                if ($salePrice === null || $salePrice <= 0 || !is_finite($salePrice)) {
                    $skippedNoSalePrice++;
                    continue;
                }

                $checked++;

                $impliedMarkup = $pricingService->calculateMarkup(
                    $unitPrice,
                    (string) ($product->currency ?? 'ARS'),
                    $salePrice,
                    $product->iva_id ? (int) $product->iva_id : null
                );

                if (!is_finite($impliedMarkup) || $impliedMarkup < 0) {
                    $skippedInvalid++;
                    continue;
                }

                $delta = abs($impliedMarkup - $storedMarkup);
                if ($delta < $tolerance) {
                    continue;
                }

                if ($limit > 0 && count($rows) < $limit) {
                    $rows[] = [
                        'id' => $product->id,
                        'code' => $product->code,
                        'unit_price' => $unitPrice,
                        'currency' => (string) ($product->currency ?? 'ARS'),
                        'sale_price' => $salePrice,
                        'iva_id' => $product->iva_id,
                        'stored_markup_%' => round($storedMarkup * 100, 2),
                        'new_markup_%' => round($impliedMarkup * 100, 2),
                        'delta_pp' => round($delta * 100, 2),
                    ];
                }

                if ($fix) {
                    $product->update(['markup' => $impliedMarkup]);
                    $updated++;
                }
            }
        });

        $this->line('');
        $this->info('SYNC MARKUP (desde sale_price)');
        $this->line("Modo: " . ($dryRun ? 'DRY-RUN' : 'FIX'));
        $this->line("Tolerancia: {$tolerance} (decimal) = " . round($tolerance * 100, 2) . "pp");
        $this->line("Chequeados (con unit_price>0 y sale_price>0): {$checked}");
        $this->line("Saltados sin unit_price válido: {$skippedNoUnitPrice}");
        $this->line("Saltados sin sale_price válido: {$skippedNoSalePrice}");
        $this->line("Saltados por implied_markup inválido: {$skippedInvalid}");
        $this->line("Actualizados (solo en --fix): {$updated}");

        if (!empty($rows)) {
            $this->line('');
            $this->table(
                ['id', 'code', 'unit_price', 'currency', 'sale_price', 'iva_id', 'stored_markup_%', 'new_markup_%', 'delta_pp'],
                $rows
            );
        }

        $this->line('');
        return 0;
    }
}

