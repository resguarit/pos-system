<?php

namespace App\Console\Commands;

use App\Models\Supplier;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ImportLegacySuppliers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'import:legacy-suppliers {file : Ruta absoluta al archivo SQL del sistema viejo} {--dry-run : Ejecuta sin insertar registros} {--fresh : Borra TODOS los proveedores existentes antes de importar}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Importa proveedores desde un archivo SQL exportado del sistema anterior, preservando sus IDs originales.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $filePath = $this->argument('file');
        $dryRun = $this->option('dry-run');
        $fresh = $this->option('fresh');

        if (!file_exists($filePath)) {
            $this->error("El archivo no existe: {$filePath}");
            return 1;
        }

        if ($fresh && !$dryRun) {
            if ($this->confirm('¿Está seguro que desea BORRAR TODOS los proveedores existentes? ESTO PUEDE ROMPER RELACIONES CON PRODUCTOS EXISTENTES.', true)) {
                $this->info('Limpiando base de datos de proveedores...');

                Schema::disableForeignKeyConstraints();
                Supplier::truncate();
                Schema::enableForeignKeyConstraints();

                $this->info('Base de datos limpiada.');
            }
        }

        $this->info("Leyendo archivo: {$filePath}");
        $content = file_get_contents($filePath);

        // Regex para capturar tuplas (id, 'nombre')
        // Busca patrones como: (3, 'CENTRAL TIENDA ')
        // Asume que el INSERT es: INSERT INTO `Query_Result` (`per_id`, `per_razon_social`) VALUES
        $pattern = "/\((\d+),\s*'([^']*(?:''[^']*)*)'\)/";

        preg_match_all($pattern, $content, $matches, PREG_SET_ORDER);

        $total = count($matches);
        $this->info("Se encontraron {$total} registros para procesar.");

        if ($total === 0) {
            $this->warn("No se encontraron registros. Verifique que el formato coincida con: (ID, 'RAZON_SOCIAL')");
            return 0;
        }

        if ($dryRun) {
            $this->info("--- MODO DRY-RUN (No se guardarán cambios) ---");
        }

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $inserted = 0;
        $errors = 0;

        DB::beginTransaction();

        try {
            // Permitir asignación masiva del ID
            Supplier::unguard();

            foreach ($matches as $match) {
                // $match[1] es per_id (ID)
                // $match[2] es per_razon_social (Nombre)

                $id = (int) $match[1];
                $name = str_replace("''", "'", trim($match[2]));

                if (!$dryRun) {
                    try {
                        // Usamos updateOrCreate para ser idempotentes si no se usó --fresh
                        // Pero forzamos el ID
                        Supplier::updateOrCreate(
                            ['id' => $id],
                            [
                                'name' => $name,
                                'status' => 'active',
                                // Resto de campos nulos por ahora
                            ]
                        );
                        $inserted++;
                    } catch (\Exception $e) {
                        $errors++;
                        $this->error("Error al importar ID {$id} ({$name}): " . $e->getMessage());
                    }
                } else {
                    $inserted++;
                }

                $bar->advance();
            }

            // Volver a proteger el modelo
            Supplier::reguard();

            if (!$dryRun) {
                DB::commit();
                $this->newLine();
                $this->info("Importación completada exitosamente.");
            } else {
                DB::rollBack();
                $this->newLine();
                $this->info("Simulación terminada.");
            }

            $this->table(
                ['Métrica', 'Cantidad'],
                [
                    ['Total Encontrados', $total],
                    ['Importados', $inserted],
                    ['Errores', $errors],
                ]
            );

        } catch (\Exception $e) {
            DB::rollBack();
            Supplier::reguard(); // Asegurar que se vuelve a proteger
            $this->newLine();
            $this->error("Error fatal durante la importación: " . $e->getMessage());
            return 1;
        }

        return 0;
    }
}
