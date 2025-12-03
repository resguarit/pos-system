<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Resguar\AfipSdk\Facades\Afip;
use Resguar\AfipSdk\Exceptions\AfipException;

class AfipDumpParams extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'afip:params
                            {--cuit= : CUIT específico para consultar (opcional; por defecto usa config(\'afip.cuit\'))}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Muestra los tipos de comprobante y puntos de venta habilitados en AFIP para un CUIT dado';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $cuit = $this->option('cuit') ?: config('afip.cuit');

        if (!$cuit) {
            $this->error('❌ CUIT no configurado. Configure AFIP_CUIT en .env o use --cuit=XXXXXXXXXXX');
            return 1;
        }

        $environment = config('afip.environment', 'testing');

        $this->info('🔍 Consultando parámetros de AFIP (WSFE)...');
        $this->line("   CUIT: {$cuit}");
        $this->line("   Entorno: {$environment}");
        $this->newLine();

        try {
            // Tipos de comprobante
            $this->info('1️⃣ Tipos de comprobante habilitados (FEParamGetTiposCbte)');

            $types = Afip::getAvailableReceiptTypes($cuit);

            if (empty($types)) {
                $this->warn('   ⚠️ No se recibieron tipos de comprobante habilitados.');
            } else {
                $rows = [];
                foreach ($types as $type) {
                    $rows[] = [
                        $type['id'] ?? $type['code'] ?? '',
                        $type['description'] ?? '',
                        $type['from'] ?? '',
                        $type['to'] ?? '',
                    ];
                }

                $this->table(
                    ['Código', 'Descripción', 'Desde', 'Hasta'],
                    $rows
                );
            }

            $this->newLine();

            // Puntos de venta
            $this->info('2️⃣ Puntos de venta habilitados (FEParamGetPtosVenta)');

            $points = Afip::getAvailablePointsOfSale($cuit);

            if (empty($points)) {
                $this->warn('   ⚠️ No se recibieron puntos de venta habilitados.');
            } else {
                $rows = [];
                foreach ($points as $pos) {
                    $rows[] = [
                        $pos['number'] ?? '',
                        $pos['type'] ?? '',
                        isset($pos['enabled']) && $pos['enabled'] ? 'Sí' : 'No',
                        $pos['from'] ?? '',
                        $pos['to'] ?? '',
                    ];
                }

                $this->table(
                    ['Pto Vta', 'Tipo', 'Habilitado', 'Desde', 'Hasta'],
                    $rows
                );
            }

            $this->newLine();

            $this->info('✅ Consulta de parámetros completada.');
            $this->newLine();

            $this->line('💡 Usa estos datos para configurar en tu POS:');
            $this->line('   - Tipos de comprobante AFIP por sucursal (A/B/C, etc.)');
            $this->line('   - Puntos de venta válidos para cada CUIT/sucursal');

            return 0;
        } catch (AfipException $e) {
            $this->newLine();
            $this->error('❌ Error de AFIP: ' . $e->getMessage());

            if ($e->getAfipCode()) {
                $this->error('   Código AFIP: ' . $e->getAfipCode());
            }

            $this->newLine();
            $this->line('💡 Sugerencias:');
            $this->line('   - Verifica que el CUIT tenga habilitado el servicio WSFE en AFIP/ARCA');
            $this->line('   - Verifica que el certificado sea válido y esté asociado a ese CUIT');
            $this->line('   - Revisa los logs: tail -f storage/logs/laravel.log');

            return 1;
        } catch (\Exception $e) {
            $this->newLine();
            $this->error('❌ Error inesperado: ' . $e->getMessage());
            return 1;
        }
    }
}


