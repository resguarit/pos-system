<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\PricingService;
use Illuminate\Console\Command;

class AuditProductMarkups extends Command
{
    protected $signature = 'products:audit-markup
                            {--tolerance=0.05 : Tolerancia en delta de markup decimal (0.05 = 5pp)}
                            {--limit=30 : Cantidad de ejemplos a mostrar}
                            {--batch=500 : Tamaño de lote para chunk()}
                            {--only-mismatches : Solo listar mismatches (no imprime ejemplos de otros casos)}';

    protected $description = 'Audita markups: compara markup almacenado vs markup implícito por unit_price/sale_price/IVA usando PricingService';

    public function handle(PricingService $pricingService): int
    {
        $tolerance = (float) $this->option('tolerance');
        $limit = max(0, (int) $this->option('limit'));
        $batch = max(50, (int) $this->option('batch'));
        $onlyMismatches = (bool) $this->option('only-mismatches');

        $checked = 0;
        $skippedNoSalePrice = 0;
        $skippedNoUnitPrice = 0;
        $skippedInvalid = 0;
        $mismatches = 0;

        $examples = [];

        Product::query()
            ->select(['id', 'code', 'description', 'unit_price', 'currency', 'markup', 'sale_price', 'iva_id'])
            ->orderBy('id')
            ->chunk($batch, function ($products) use (
                $pricingService,
                $tolerance,
                $limit,
                $onlyMismatches,
                &$checked,
                &$skippedNoSalePrice,
                &$skippedNoUnitPrice,
                &$skippedInvalid,
                &$mismatches,
                &$examples
            ) {
                foreach ($products as $product) {
                    // Usar valores crudos de DB para evitar accessors/appends
                    $unitPrice = (float) $product->getRawOriginal('unit_price');
                    $salePrice = $product->getRawOriginal('sale_price');
                    $salePrice = $salePrice === null ? null : (float) $salePrice;
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
                    $isMismatch = $delta >= $tolerance;
                    if ($isMismatch) {
                        $mismatches++;
                    }

                    if ($limit > 0 && count($examples) < $limit) {
                        if (!$onlyMismatches || $isMismatch) {
                            $examples[] = [
                                'id' => $product->id,
                                'code' => $product->code,
                                'unit_price' => $unitPrice,
                                'currency' => (string) ($product->currency ?? 'ARS'),
                                'sale_price' => $salePrice,
                                'iva_id' => $product->iva_id,
                                'stored_markup_%' => round($storedMarkup * 100, 2),
                                'implied_markup_%' => round($impliedMarkup * 100, 2),
                                'delta_pp' => round($delta * 100, 2),
                            ];
                        }
                    }
                }
            });

        $this->line('');
        $this->info('AUDITORÍA DE MARKUP (DB vs implícito por sale_price)');
        $this->line("Tolerancia: {$tolerance} (decimal) = " . round($tolerance * 100, 2) . "pp");
        $this->line("Productos chequeados (con unit_price>0 y sale_price>0): {$checked}");
        $this->line("Saltados sin unit_price válido: {$skippedNoUnitPrice}");
        $this->line("Saltados sin sale_price válido: {$skippedNoSalePrice}");
        $this->line("Saltados por implied_markup inválido: {$skippedInvalid}");
        $this->line("Mismatches (delta >= tolerancia): {$mismatches}");

        if (!empty($examples)) {
            $this->line('');
            $this->warn('Ejemplos:');
            $this->table(
                ['id', 'code', 'unit_price', 'currency', 'sale_price', 'iva_id', 'stored_markup_%', 'implied_markup_%', 'delta_pp'],
                $examples
            );
        } else {
            $this->line('');
            $this->line('Sin ejemplos para mostrar (subí --limit o quitá --only-mismatches).');
        }

        $this->line('');
        return $mismatches > 0 ? 2 : 0;
    }
}

