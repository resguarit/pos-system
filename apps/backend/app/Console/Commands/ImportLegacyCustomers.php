<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Models\Person;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ImportLegacyCustomers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'import:legacy-customers {file : Ruta absoluta al archivo SQL del sistema viejo} {--dry-run : Ejecuta sin insertar registros}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Importa clientes desde un archivo SQL exportado del sistema anterior (formato Query_Result)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $filePath = $this->argument('file');
        $dryRun = $this->option('dry-run');

        if (!file_exists($filePath)) {
            $this->error("El archivo no existe: {$filePath}");
            return 1;
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
                        // Opcional: Loguear error específico si es necesario
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
        // Lógica de separación de nombre
        $parts = explode(' ', $fullName);
        $firstName = $fullName;
        $lastName = null;

        if (count($parts) > 1) {
            $firstName = array_shift($parts); // Primera palabra
            $lastName = implode(' ', $parts); // Resto de las palabras
        }

        // Crear persona
        $person = Person::create([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'documento' => empty($dni) ? null : $dni,
            'phone' => empty($phone) ? null : $phone,
            'person_type' => 'customer',
            // Valores por defecto requeridos por el modelo si los hubiera
        ]);

        // Crear cliente asociado
        Customer::create([
            'person_id' => $person->id,
            'active' => true,
            'notes' => 'Importado de sistema anterior',
        ]);
    }
}
