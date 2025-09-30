<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Database\Seeders\ProductionSeeder;

class SeedProduction extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:seed:production 
                            {--force : Ejecutar sin confirmación}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ejecuta solo los seeders esenciales para producción';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🏭 Ejecutando seeders de producción...');
        
        if (!$this->option('force')) {
            if (!$this->confirm('¿Estás seguro de que quieres ejecutar los seeders de producción?')) {
                $this->info('Operación cancelada.');
                return;
            }
        }
        
        try {
            $this->call(ProductionSeeder::class);
            $this->info('✅ Seeders de producción ejecutados correctamente');
        } catch (\Exception $e) {
            $this->error('❌ Error al ejecutar seeders de producción: ' . $e->getMessage());
            return 1;
        }
        
        return 0;
    }
}
