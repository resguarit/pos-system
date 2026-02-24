<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\FiscalCondition;

class FixCustomersFiscalCondition extends Command
{
    protected $signature = 'customers:fix-fiscal-condition
                            {--dry-run : Muestra qué clientes se actualizarían sin hacer cambios}';

    protected $description = 'Corrige la condición fiscal de clientes sin CUIT ni DNI de Responsable Inscripto a Consumidor Final';

    public function handle(): int
    {
        // 1. Resolver IDs dinámicamente por AFIP code
        $riCondition = FiscalCondition::where('afip_code', '1')->first();
        $cfCondition = FiscalCondition::where('afip_code', '5')->first();

        if (!$riCondition || !$cfCondition) {
            $this->error('No se encontraron las condiciones fiscales necesarias (RI=afip_code 1, CF=afip_code 5).');
            $this->error('Verificá que la tabla fiscal_conditions tenga los datos correctos.');
            return 1;
        }

        $this->info("Responsable Inscripto: ID {$riCondition->id} (afip_code {$riCondition->afip_code})");
        $this->info("Consumidor Final:      ID {$cfCondition->id} (afip_code {$cfCondition->afip_code})");
        $this->newLine();

        // 2. Buscar clientes con RI que no tienen CUIT ni DNI válido
        $affectedCustomers = DB::table('customers')
            ->join('people', 'customers.person_id', '=', 'people.id')
            ->leftJoin('customer_tax_identities', 'customers.id', '=', 'customer_tax_identities.customer_id')
            ->where('people.fiscal_condition_id', $riCondition->id)
            ->where(function ($query) {
                $query->whereNull('people.cuit')
                    ->orWhere('people.cuit', '');
            })
            ->where(function ($query) {
                $query->whereNull('people.documento')
                    ->orWhere('people.documento', '')
                    ->orWhere('people.documento', '0');
            })
            ->whereNull('customer_tax_identities.id') // Sin identidades fiscales
            ->select(
                'customers.id as customer_id',
                'people.id as person_id',
                'people.first_name',
                'people.last_name',
                'people.cuit',
                'people.documento',
                'people.fiscal_condition_id'
            )
            ->get();

        $count = $affectedCustomers->count();

        if ($count === 0) {
            $this->info('✅ No hay clientes para corregir. Todos están bien.');
            return 0;
        }

        $this->warn("Se encontraron {$count} clientes con condición RI pero sin CUIT ni DNI.");
        $this->newLine();

        // 3. Mostrar tabla de clientes afectados
        $tableData = $affectedCustomers->map(fn($c) => [
            $c->customer_id,
            trim(($c->first_name ?? '') . ' ' . ($c->last_name ?? '')),
            $c->cuit ?: '-',
            $c->documento ?: '-',
            "RI → CF",
        ])->toArray();

        $this->table(
            ['ID Cliente', 'Nombre', 'CUIT', 'DNI', 'Cambio'],
            $tableData
        );

        $isDryRun = $this->option('dry-run');

        if ($isDryRun) {
            $this->newLine();
            $this->info("🔍 Modo dry-run: no se realizaron cambios.");
            $this->info("   Ejecutá sin --dry-run para aplicar los cambios.");
            return 0;
        }

        // 4. Confirmar y aplicar
        if (!$this->confirm("¿Actualizar estos {$count} clientes a Consumidor Final?", true)) {
            $this->info('Operación cancelada.');
            return 0;
        }

        $personIds = $affectedCustomers->pluck('person_id')->toArray();

        $updated = DB::table('people')
            ->whereIn('id', $personIds)
            ->update(['fiscal_condition_id' => $cfCondition->id]);

        $this->newLine();
        $this->info("✅ Se actualizaron {$updated} clientes a Consumidor Final.");

        return 0;
    }
}
