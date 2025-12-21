<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Iva;
use App\Models\Measure;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ImportLegacyProducts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'import:legacy-products {file : Ruta absoluta al archivo SQL del sistema viejo} {--dry-run : Ejecuta sin insertar registros} {--fresh : Borra TODOS los productos existentes antes de importar}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Importa productos desde un archivo SQL exportado del sistema anterior.';

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
            if ($this->confirm('¿Está seguro que desea BORRAR TODOS los productos existentes?', true)) {
                $this->info('Limpiando base de datos de productos...');

                Product::truncate();

                $this->info('Base de datos limpiada.');
            }
        }

        // Asegurar dependencias por defecto
        $defaultMeasure = Measure::firstOrCreate(['name' => 'Unidad']);
        $defaultCategory = Category::firstOrCreate(['name' => 'General'], ['description' => 'Categoría por defecto importada']);
        $defaultIva = Iva::where('rate', 21)->first(); // Asumimos 21 como default seguro

        if (!$defaultIva) {
            $defaultIva = Iva::firstOrCreate(['rate' => 21.00]);
        }

        $this->info("Usando defaults: Medida ID {$defaultMeasure->id}, Categoría ID {$defaultCategory->id}, IVA ID {$defaultIva->id}");

        $this->info("Leyendo archivo: {$filePath}");
        $content = file_get_contents($filePath);

        // Regex para capturar valores de Query_Result
        // INSERT INTO `Query_Result` (`pp_activo`, `pp_per_id`, `prod_codigo_barra`, `prod_descripcion`, `pp_costo`, `pp_iva`, `pp_porcentajeUnidades`, `pp_precio_finalUnidades`) 
        // Example: ('N', 8, '0001', 'ROYAL CANIN MINI ADULTO X 1 KG ', 100, 100, 20, 240)

        $pattern = "/\('([^']*)',\s*(\d+),\s*'([^']*)',\s*'([^']*)',\s*([\d\.]+),\s*([\d\.]+),\s*([\d\.]+),\s*([\d\.]+)\)/";

        preg_match_all($pattern, $content, $matches, PREG_SET_ORDER);

        $total = count($matches);
        $this->info("Se encontraron {$total} registros para procesar.");

        if ($total === 0) {
            $this->warn("No se encontraron registros. Verifique que el formato coincida con: (Activo, ProveedorID, Codigo, Descripcion, Costo, Iva, Porcentaje, PrecioFinal)");
            return 0;
        }

        if ($dryRun) {
            $this->info("--- MODO DRY-RUN (No se guardarán cambios) ---");
        }

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $inserted = 0;
        $errors = 0;
        $skipped = 0;

        DB::beginTransaction();

        try {
            foreach ($matches as $match) {
                // $match[1] pp_activo ('S'/'N')
                // $match[2] pp_per_id (Supplier Legacy ID)
                // $match[3] prod_codigo_barra
                // $match[4] prod_descripcion
                // $match[5] pp_costo
                // $match[6] pp_iva (Ignorado, usamos default 21)
                // $match[7] pp_porcentajeUnidades (Markup legacy)
                // $match[8] pp_precio_finalUnidades (Sale Price)

                $active = trim($match[1]) === 'S'; // 'S' es activo, 'N' inactivo
                $supplierId = (int) $match[2];
                $code = trim($match[3]);
                $description = trim($match[4]);
                $cost = (float) $match[5];
                $salePrice = (float) $match[8];

                // Verificar si existe el proveedor con ese ID
                if (!Supplier::find($supplierId)) {
                    // Si no existe con ese ID, lo ponemos a null o al default si quisiéramos
                    // Por ahora lo dejamos en null para que no falle la FK si no existe, 
                    // aunque la FK suele ser estricta. Verificamos:
                    // La migración de productos define supplier_id como foreignId->constrained. Si el ID no existe, fallará.
                    // Opcion: Asignar a un proveedor "Desconocido" o saltar.
                    // Asumiremos que el usuario ya corrió el importador de proveedores.
                    // Si falla, mostramos error específico.
                }

                $markup = 0;
                if ($cost > 0) {
                    $markup = ($salePrice / $cost) - 1;
                }

                if (!$dryRun) {
                    try {
                        Product::updateOrCreate(
                            ['code' => $code],
                            [
                                'description' => $description,
                                'measure_id' => $defaultMeasure->id,
                                'unit_price' => $cost,
                                'currency' => 'ARS', // Default
                                'markup' => $markup,
                                'sale_price' => $salePrice, // El mutator/observer se encargará del resto si es necesario, pero guardamos el hardcodeado
                                'category_id' => $defaultCategory->id,
                                'iva_id' => $defaultIva->id,
                                'supplier_id' => $supplierId, // Puede fallar si no existe
                                'status' => $active ? 1 : 0,
                                'web' => false,
                                'observaciones' => 'Importado de sistema anterior',
                                'image_id' => null
                            ]
                        );
                        $inserted++;
                    } catch (\Exception $e) {
                        // Fallback para supplier inexistente: intentar poner supplier_id null si la tabla lo permite
                        // Revisé la migración y NO dice ->nullable() explícitamente en la definición original,
                        // PERO hay una migración `2025_09_26_104150_make_measure_id_and_supplier_id_nullable_in_products_table.php`
                        // Así que debería permitir null.

                        if (str_contains($e->getMessage(), 'supplier_id')) {
                            try {
                                Product::updateOrCreate(
                                    ['code' => $code],
                                    [
                                        'description' => $description,
                                        'measure_id' => $defaultMeasure->id,
                                        'unit_price' => $cost,
                                        'currency' => 'ARS',
                                        'markup' => $markup,
                                        'sale_price' => $salePrice,
                                        'category_id' => $defaultCategory->id,
                                        'iva_id' => $defaultIva->id,
                                        'supplier_id' => null, // Intento sin proveedor
                                        'status' => $active ? 1 : 0,
                                        'web' => false,
                                        'observaciones' => 'Importado de sistema anterior (Proveedor no encontrado ID: ' . $supplierId . ')',
                                    ]
                                );
                                $inserted++;
                                // Loguear warning pero contar como insertado
                                $this->warn("Producto {$code} importado sin proveedor (ID {$supplierId} no existe).");
                                continue;
                            } catch (\Exception $ex) {
                                $errors++;
                                $this->error("Error al importar {$code}: " . $ex->getMessage());
                            }
                        } else {
                            $errors++;
                            $this->error("Error al importar {$code}: " . $e->getMessage());
                        }
                    }
                } else {
                    $inserted++;
                }

                $bar->advance();
            }

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
            $this->newLine();
            $this->error("Error fatal durante la importación: " . $e->getMessage());
            return 1;
        }

        return 0;
    }
}
