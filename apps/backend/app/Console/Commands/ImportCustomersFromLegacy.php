<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Models\Person;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportCustomersFromLegacy extends Command
{
    protected $signature = 'customers:import-legacy {--dry-run : Solo simula la importación sin insertar}';
    protected $description = 'Importa clientes desde el sistema anterior de Santiago y Francisco';

    public function handle()
    {
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->info('🔍 Modo DRY-RUN: No se insertarán datos');
        }

        $customers = $this->getLegacyData();

        $this->info("📦 Total de registros a importar: " . count($customers));

        if (!$this->confirm('¿Desea continuar con la importación?')) {
            $this->info('Importación cancelada');
            return 0;
        }

        $bar = $this->output->createProgressBar(count($customers));
        $bar->start();

        $imported = 0;
        $errors = 0;
        $skipped = 0;

        DB::beginTransaction();

        try {
            foreach ($customers as $data) {
                try {
                    // Saltar si no hay nombre
                    if (empty(trim($data[0]))) {
                        $skipped++;
                        $bar->advance();
                        continue;
                    }

                    if (!$dryRun) {
                        $this->importCustomer($data);
                    }
                    $imported++;
                } catch (\Exception $e) {
                    $errors++;
                    // Log silencioso para no interrumpir
                }
                $bar->advance();
            }

            if (!$dryRun) {
                DB::commit();
            }
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Error fatal: ' . $e->getMessage());
            return 1;
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("✅ Importados: {$imported}");
        $this->info("⏭️  Saltados (sin nombre): {$skipped}");
        if ($errors > 0) {
            $this->warn("⚠️  Errores: {$errors}");
        }

        return 0;
    }

    private function importCustomer(array $data): void
    {
        $name = trim($data[0]);
        $dni = trim($data[1] ?? '');
        $phone = trim($data[2] ?? '');

        // Separar nombre y apellido si tiene 2+ palabras
        $nameParts = $this->splitName($name);

        // Crear la persona
        $person = Person::create([
            'first_name' => $nameParts['first_name'],
            'last_name' => $nameParts['last_name'],
            'phone' => $phone ?: null,
            'documento' => $dni ?: null,
            'person_type' => 'customer',
        ]);

        // Crear el cliente
        Customer::create([
            'person_id' => $person->id,
            'active' => true,
        ]);
    }

    private function splitName(string $fullName): array
    {
        $fullName = trim($fullName);
        $parts = preg_split('/\s+/', $fullName);

        if (count($parts) >= 2) {
            $firstName = array_shift($parts);
            $lastName = implode(' ', $parts);
            return [
                'first_name' => $firstName,
                'last_name' => $lastName,
            ];
        }

        return [
            'first_name' => $fullName,
            'last_name' => null,
        ];
    }

    private function getLegacyData(): array
    {
        // Formato: [nombre, dni, telefono]
        return [
            ['CONSUMIDOR FINAL', '', ''],
            ['LUCAS RECIO', '23979343', '2215032798'],
            ['IGNACIO COLOMBO', '41006107', '2216745466'],
            ['ALEX MARTIN MACIEL BRITEZ', '42365594', '2216195994'],
            ['OMAR MOSQUERA', '16678318', '1141586133'],
            ['mirta noemi melon', '18069886', '2215058141'],
            ['KARINA GONNET', '', '2214659432'],
            ['walter skramowskyj', '27355808', '2216261438'],
            ['MARITE GASPARETI', '', '2216211830'],
            ['SILVIA BUGALLO', '', '2214542191'],
            ['CARLOS', '', '2213534062'],
            ['ALEXIS PERI', '44003187', '2215416430'],
            ['LILIANA', '', '2241467138'],
            ['VILLALBA', '', '2215693218'],
            ['MARIANA SILVA', '36832816', '2215977185'],
            ['MARIANELLA SANCHEZ', '', '2213545071'],
            ['CRUZADO SOFIA', '', '2215916379'],
            ['FEDERICO', '', '2214555300'],
            ['LUCIANA', '', '2215965814'],
            ['JULIETA', '', '2216234623'],
            ['ELIANA', '', '2216210185'],
            ['SOL', '', '2216030170'],
            ['ANA', '', '2215790122'],
            ['gaston', '', '2215038086'],
            ['VALERIA CODESIDO', '', '2215662020'],
            ['RODRIGO', '', '2216681103'],
            ['GABRIELA', '', '2214086758'],
            ['ADAN BELTRAN', '', '2215374088'],
            ['MANUEL CORONEL', '', '1173622293'],
            ['ALICIA LAUCIRICA', '', '2216096367'],
            ['GABY', '', '2215609716'],
            ['GLORIA', '', '2216321701'],
            ['CLARA', '', '2215062804'],
            ['MARIA BELEN ZARAGOZA', '', '2215603198'],
            ['INES', '', '2214591653'],
            ['CARLA', '', '2241540504'],
            ['ROCIO', '', '2214383296'],
            ['MARIELA', '', '2215378287'],
            ['VALERIA', '', '2215658479'],
            ['ANAIS', '', '2215459913'],
            ['PATRICIA', '', '2213623124'],
            ['ADRIANA', '', '2994713113'],
            ['NORMA', '', '2214211911'],
            ['ELBA AGUIRRE', '', '2214354416'],
            ['MATIAS', '', '2214985341'],
            ['WENDY', '', '2215386751'],
            ['OSCAR', '', '2213191734'],
            ['MATIAS', '', '2215925605'],
            ['MARIA LAURA', '', '2214353828'],
            ['EUGENIA', '', '2215417344'],
            ['NATALIA', '', '2214205495'],
            ['EVE', '', '2216410129'],
            ['JUAN', '', '2216075031'],
            ['HEBER FERRER DGUEZ', '85050304982', '2216809874'],
            ['MARIANA', '', '2214952869'],
            ['ARACELI MASTELLONE', '', '2216770918'],
            ['MARCELO', '', '2215387274'],
            ['EVANGELINA', '', '2215733693'],
            ['MARCELO Y VIVIANA AMBROSI', '', '2215387274'],
            ['ANDREA VEGA', '', '2214400707'],
            ['CALLEJEROS CITY BELL', '', '2213566311'],
            ['FERNANDA', '', '1155124026'],
            ['SONIA', '', '2215556563'],
            ['MARIA ESTER', '', '2216207430'],
            ['MARTIN', '', '2215645319'],
            ['MAXIMILIANO', '', '2216771660'],
            ['MONICA', '', '2216262545'],
            ['CAMILA PRADO', '', '2213643739'],
            ['469 Y BELGRANO', '', '2215043085'],
            ['CECILIA VALBUENA', '', '2216174769'],
            ['LUCIANA CASASOLA', '', '2215043085'],
            ['ERICA', '', '2216696316'],
            ['ELIANA GUALCO', '', '2216194894'],
            ['PILAR', '', '2216215683'],
            ['MICAELA', '', '2215385409'],
            ['CARLOS', '', '221317607'],
            ['SUSANA', '', '2215465862'],
            ['LUNA', '', '2215943232'],
            ['ETEL', '', '2214212221'],
            ['GERMAN', '', '2214084872'],
            ['MARIA ELENA', '', '2213510504'],
            ['ESTELA PUJOL', '', '2214890097'],
            ['HUGO', '', '5117890'],
            ['LAURA', '', '1150278974'],
            ['NILEMA', '', '2215917445'],
            ['GRACIELA', '', '2214946823'],
            ['gabriela (31)', '', '2215725377'],
            ['GISEL', '', '2216387653'],
            ['NARDIS', '', '2215763427'],
            ['ESTELA', '', '2216057828'],
            ['CARINA', '', '2216380852'],
            ['GABRIEL MOSCOSO', '', '2213190863'],
            ['VALENTINA', '', '2494551738'],
            ['NORMA', '', '2215670458'],
            ['JUDITH BARREDA', '', '2215022905'],
            ['CAMILA', '', '2215049090'],
            ['ESTELA 134', '', '2214940104'],
            ['RAUL', '', '4791372'],
            ['CRISTINA', '', '2216380812'],
            ['MONICA LOPEZ', '', '2214000406'],
            // ... continúa en el siguiente archivo por tamaño
        ];
    }
}
