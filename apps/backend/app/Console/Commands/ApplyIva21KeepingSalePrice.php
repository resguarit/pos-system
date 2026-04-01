<?php

namespace App\Console\Commands;

use App\Models\Iva;
use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ApplyIva21KeepingSalePrice extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'products:apply-iva-21
                            {--dry-run : Muestra el impacto sin guardar cambios}
                            {--force : Ejecuta sin confirmacion interactiva}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Asigna IVA 21% a todos los productos manteniendo su precio de venta actual';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');

        $iva21 = Iva::query()->where('rate', 21)->first();
        if (!$iva21) {
            $this->error('No se encontro un registro de IVA con rate=21.');
            $this->line('Tip: ejecuta los seeders de IVA y vuelve a intentar.');
            return self::FAILURE;
        }

        $totalProducts = Product::count();
        if ($totalProducts === 0) {
            $this->warn('No hay productos para procesar.');
            return self::SUCCESS;
        }

        $alreadyWithIva21 = Product::where('iva_id', $iva21->id)->count();
        $toUpdate = $totalProducts - $alreadyWithIva21;

        $this->info('Se aplicara IVA 21% conservando exactamente el precio de venta actual.');
        $this->line("Productos totales: {$totalProducts}");
        $this->line("Ya en IVA 21: {$alreadyWithIva21}");
        $this->line("A actualizar: {$toUpdate}");

        if ($dryRun) {
            $this->comment('Modo dry-run activo: no se guardaran cambios.');
            return self::SUCCESS;
        }

        if (!$force && !$this->confirm('Esta accion actualizara productos en base de datos. Desea continuar?')) {
            $this->warn('Operacion cancelada por el usuario.');
            return self::SUCCESS;
        }

        $processed = 0;
        $updated = 0;

        DB::transaction(function () use ($iva21, &$processed, &$updated): void {
            Product::query()->chunkById(500, function ($products) use ($iva21, &$processed, &$updated): void {
                foreach ($products as $product) {
                    $processed++;

                    // Captura el precio de venta visible actual (manual o calculado dinamicamente)
                    // para preservarlo al cambiar el IVA.
                    $currentSalePrice = (float) $product->sale_price;

                    if ((int) $product->iva_id !== (int) $iva21->id || (float) ($product->getRawOriginal('sale_price') ?? 0) !== $currentSalePrice) {
                        $product->forceFill([
                            'iva_id' => $iva21->id,
                            'sale_price' => $currentSalePrice,
                        ])->saveQuietly();

                        $updated++;
                    }
                }
            });
        });

        $this->info('Proceso finalizado correctamente.');
        $this->line("Procesados: {$processed}");
        $this->line("Actualizados: {$updated}");

        return self::SUCCESS;
    }
}
