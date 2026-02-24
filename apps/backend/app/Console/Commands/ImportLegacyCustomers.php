<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Models\Person;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Interfaces\CustomerServiceInterface;

class ImportLegacyCustomers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'import:legacy-customers {file : Ruta absoluta al archivo SQL del sistema viejo} {--dry-run : Ejecuta sin insertar registros} {--fresh : Borra TODOS los clientes existentes antes de importar}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Importa clientes desde un archivo SQL exportado del sistema anterior (formato Query_Result)';

    protected $customerService;

    public function __construct(CustomerServiceInterface $customerService)
    {
        parent::__construct();
        $this->customerService = $customerService;
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
            if ($this->confirm('¿Está seguro que desea BORRAR TODOS los clientes existentes antes de importar?', true)) {
                $this->info('Limpiando base de datos de clientes...');

                // Desactivar checks de claves foráneas para permitir truncate/delete
                DB::statement('SET FOREIGN_KEY_CHECKS=0;');

                try {
                    Customer::truncate();
                    // Solo borramos personas que sean clientes para no borrar usuarios del sistema
                    Person::where('person_type', 'customer')->delete();

                    $this->info('Base de datos limpiada.');
                } catch (\Exception $e) {
                    $this->error('Error al limpiar base de datos: ' . $e->getMessage());
                    return 1;
                } finally {
                    DB::statement('SET FOREIGN_KEY_CHECKS=1;');
                }
            }
        }

        $this->info("Leyendo archivo: {$filePath}");
        $content = file_get_contents($filePath);

        // Regex para capturar los valores ('Nombre', 'DNI', 'Telefono')
        // Maneja comillas simples escapadas como ''
        $pattern = "/\('([^']*(?:''[^']*)*)', '([^']*(?:''[^']*)*)', '([^']*(?:''[^']*)*)'\)/";

        preg_match_all($pattern, $content, $matches, PREG_SET_ORDER);

        $total = count($matches);
        $this->info("Se encontraron {$total} registros para procesar.");

        if ($total === 0) {
            $this->warn("No se encontraron registros. Verifique que el formato coincida con: ('NOMBRE', 'DNI', 'TEL')");
            return 0;
        }

        if ($dryRun) {
            $this->info("--- MODO DRY-RUN (No se guardarán cambios) ---");
        }

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $inserted = 0;
        $skipped = 0;
        $errors = 0;

        DB::beginTransaction();

        try {
            foreach ($matches as $match) {
                // $match[0] es toda la cadena coincidente
                // $match[1] es per_razon_social
                // $match[2] es per_dni
                // $match[3] es per_telefonos

                // Limpiar comillas escapadas en los valores capturados ('' -> ')
                $rawName = str_replace("''", "'", trim($match[1]));
                $rawDni = str_replace("''", "'", trim($match[2]));
                $rawPhone = str_replace("''", "'", trim($match[3]));

                if (empty($rawName) || $rawName === '.') {
                    $skipped++;
                    $bar->advance();
                    continue;
                }

                if (!$dryRun) {
                    try {
                        $this->createCustomer($rawName, $rawDni, $rawPhone);
                        $inserted++;
                    } catch (\Exception $e) {
                        $errors++;
                        // Log error to console to debug
                        $this->error("Error al importar {$rawName}: " . $e->getMessage());

                    }
                } else {
                    // Solo incrementamos contador si pasaría la validación básica
                    $inserted++;
                }

                $bar->advance();
            }

            if (!$dryRun) {
                DB::commit();
                $this->newLine();
                $this->info("Importación completada exitosamente.");
            } else {
                DB::rollBack(); // Por seguridad, aunque no hayamos hecho commits
                $this->newLine();
                $this->info("Simulación terminada.");
            }

            $this->table(
                ['Métrica', 'Cantidad'],
                [
                    ['Total Encontrados', $total],
                    ['Importados', $inserted],
                    ['Saltados (Sin nombre)', $skipped],
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

    private function createCustomer($fullName, $dni, $phone)
    {
        // Sanitize DNI to numbers only
        if ($dni) {
            $dni = preg_replace('/[^0-9]/', '', $dni);
            // If DNI becomes empty after sanitization (e.g. was just dashes), make it null
            if ($dni === '')
                $dni = null;
        }

        // Lógica de separación de nombre
        $parts = explode(' ', $fullName);
        $firstName = $fullName;
        $lastName = '';

        if (count($parts) > 1) {
            $firstName = array_shift($parts); // Primera palabra
            $lastName = implode(' ', $parts); // Resto de las palabras
        }

        // Resolver Consumidor Final dinámicamente por AFIP code '5'
        $consumidorFinalId = \App\Models\FiscalCondition::where('afip_code', '5')->value('id') ?? 1;

        // Preparar datos para el servicio
        // Usamos el CustomerService para asegurar que se creen las cuentas corrientes
        // y se ejecute cualquier otra lógica de negocio asociada.
        $data = [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'documento' => $dni,
            'phone' => $phone,
            'email' => null,
            'active' => true,
            'notes' => 'Importado de sistema anterior',
            // Valores por defecto que el servicio espera o manejará
            'cuit' => null,
            'address' => null,
            'city' => null,
            'state' => null,
            'postal_code' => null,
            'fiscal_condition_id' => $consumidorFinalId, // Consumidor Final (AFIP code 5)
            'person_type_id' => 1,      // Persona Física por defecto
            'credit_limit' => null,     // Infinito
        ];

        $this->customerService->createCustomer($data);
    }
}
