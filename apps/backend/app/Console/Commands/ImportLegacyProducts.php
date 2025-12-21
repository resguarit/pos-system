<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Iva;
use App\Models\Measure;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Stock;
use App\Models\Branch;
use App\Services\ProductService;
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

    protected $productService;

    public function __construct(ProductService $productService)
    {
        parent::__construct();
        $this->productService = $productService;
    }

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

                Schema::disableForeignKeyConstraints();
                Product::truncate();
                // También truncar tablas relacionadas si es necesario, 
                // pero ProductService se encargará de crear nuevas.
                // Stock se borra en cascada si está configurado, sino:
                \App\Models\Stock::truncate();
                Schema::enableForeignKeyConstraints();

                $this->info('Base de datos limpiada.');
            }
        }

        // Asegurar dependencias por defecto
        // Como no tenés categorías, creamos una "General" por defecto.
        $defaultMeasure = Measure::firstOrCreate(['name' => 'Unidad']);
        $defaultCategory = Category::firstOrCreate(['name' => 'General'], ['description' => 'Categoría por defecto importada']);
        $defaultIva = Iva::where('rate', 21)->first();

        if (!$defaultIva) {
            $defaultIva = Iva::firstOrCreate(['rate' => 21.00]);
        }

        // Obtener todas las sucursales activas para crear stock
        // ProductService se encargará de esto, pero mantenemos el warning si no hay sucursales
        $activeBranches = Branch::where('status', 1)->get();
        if ($activeBranches->isEmpty()) {
            $this->warn("No hay sucursales activas encontradas. Los productos se crearán sin stock asociado.");
        }

        $this->info("Usando defaults: Medida ID {$defaultMeasure->id}, Categoría ID {$defaultCategory->id}, IVA ID {$defaultIva->id}");
        $this->info("Sucursales para stock: " . $activeBranches->count());

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

                $active = trim($match[1]) === 'S';
                $supplierId = (int) $match[2];
                $code = trim($match[3]);
                $description = trim($match[4]);
                $cost = (float) $match[5];
                $salePrice = (float) $match[8];

                // Verificar si existe el proveedor
                if (!Supplier::find($supplierId)) {
                    // Si no existe, seteamos a null para que intente pasar (o fallará si es requerido estricto)
                    // Pero ProductService valida 'exists:suppliers,id', así que fallará si pasamos un ID inválido.
                    // Solución: Si no existe, pasamos null (si nullable) o el ID de un proveedor 'Desconocido'.
                    // Asumiremos que el usuario quiere que falle o se salte si no hay proveedor, 
                    // PERO para evitar paradas constantes, intentamos usar null si la validación lo permite.
                    // ProductController valida: 'supplier_id' => 'required|integer'. O sea, es requerido.
                    // Entonces, si no existe, fallará.
                    // Vamos a permitir que falle y loguear el error.
                }

                $markup = 0;
                if ($cost > 0) {
                    $markup = ($salePrice / $cost) - 1;
                }

                if (!$dryRun) {
                    try {
                        // Preparar datos para ProductService
                        $data = [
                            'code' => $code,
                            'description' => $description,
                            'measure_id' => $defaultMeasure->id,
                            'unit_price' => $cost,
                            'currency' => 'ARS',
                            'markup' => $markup,
                            'sale_price' => $salePrice,
                            'category_id' => $defaultCategory->id,
                            'iva_id' => $defaultIva->id,
                            'supplier_id' => $supplierId,
                            'status' => $active,
                            'web' => false,
                            'observaciones' => 'Importado de sistema anterior',
                            'image_id' => null,
                            // Stock defaults
                            'min_stock' => 1,
                            'max_stock' => 100
                        ];

                        // Verificar existencia para update vs create
                        $existingProduct = Product::where('code', $code)->first();

                        if ($existingProduct) {
                            $this->productService->updateProduct($existingProduct->id, $data);
                        } else {
                            $this->productService->createProduct($data);
                        }

                        $inserted++;

                    } catch (\Exception $e) {
                        // Manejo específico si falla por proveedor no encontrado
                        if (str_contains($e->getMessage(), 'supplier_id')) {
                            $this->warn("Skipping {$code}: Supplier ID {$supplierId} not found/invalid.");
                            $errors++;
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
