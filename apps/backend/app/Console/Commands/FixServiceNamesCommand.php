<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\ClientService;
use App\Models\ServiceType;

class FixServiceNamesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:service-names';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Synchronize ClientService names with their parent ServiceType names';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting service name synchronization...');

        $updatedCount = 0;

        // Get all active service types
        $serviceTypes = ServiceType::all();

        foreach ($serviceTypes as $serviceType) {
            // Find all client services linked to this type where the name DOES NOT match
            // We use a specific query to avoid mass updating services that might have legitimate custom names.
            // However, in this specific case, we want to update "Sistema de Gestión" to "Sistema de Gestión Plan Full".

            // Approach 1: Targeted fix for known issue
            // $count = ClientService::where('service_type_id', $serviceType->id)
            //     ->where('name', 'Sistema de Gestión') // The old name
            //     ->update(['name' => $serviceType->name]);

            // Approach 2: General sync (as requested by "Best Practices" - consistency)
            // But we must be careful not to overwrite custom overrides.
            // Heuristic: If the current name acts like a "Standard" name (i.e. matches another Service Type or is a known old value), update it.
            // simpler: Update ALL that don't match? No, that destroys customs.

            // "Best Practice" for this specific request (fix the rename issue):
            // We will update records where the name matches the *original* name of the service if we knew it, 
            // OR simpler: we update records where the name matches "Sistema de Gestión".

            // Since I don't know the exact history of every service, but I know the specific problem is "Sistema de Gestión" -> "Sistema de Gestión Plan Full".
            // I will genericize it slightly: If the name is DIFFERENT, I'll prompt (if interactive) or log it.
            // But for this task, I'll force update the known culprit.

            if ($serviceType->name === 'Sistema de Gestión Plan Full') {
                $count = ClientService::where('service_type_id', $serviceType->id)
                    ->where('name', 'Sistema de Gestión')
                    ->update(['name' => $serviceType->name]);

                if ($count > 0) {
                    $this->info("Updated $count services for type '{$serviceType->name}' from 'Sistema de Gestión'");
                    $updatedCount += $count;
                }
            }
        }

        $this->info("Task complete. Total records updated: $updatedCount");
    }
}
