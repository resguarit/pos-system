<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Database\Seeders\ProductionSeeder;
use Database\Seeders\DevelopmentSeeder;

class SeedFull extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:seed:full 
                            {--force : Ejecutar sin confirmación}
                            {--fresh : Ejecutar con fresh migration}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ejecuta todos los seeders (producción + desarrollo)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $environment = app()->environment();
        
        $this->info('🚀 Ejecutando seeders completos...');
        $this->warn('Entorno actual: ' . $environment);
        
        if (!$this->option('force')) {
            if (!$this->confirm('¿Estás seguro de que quieres ejecutar todos los seeders?')) {
                $this->info('Operación cancelada.');
                return;
            }
        }
        
        try {
            // Si se especifica --fresh, ejecutar migraciones primero
            if ($this->option('fresh')) {
                $this->info('🔄 Ejecutando migraciones fresh...');
                $this->call('migrate:fresh');
            }
            
            // Ejecutar seeders de producción
            $this->info('🏭 Ejecutando seeders de producción...');
            $this->call(ProductionSeeder::class);
            
            // Ejecutar seeders de desarrollo
            $this->info('🧪 Ejecutando seeders de desarrollo...');
            $this->call(DevelopmentSeeder::class);
            
            $this->info('✅ Todos los seeders ejecutados correctamente');
        } catch (\Exception $e) {
            $this->error('❌ Error al ejecutar seeders: ' . $e->getMessage());
            return 1;
        }
        
        return 0;
    }
}


