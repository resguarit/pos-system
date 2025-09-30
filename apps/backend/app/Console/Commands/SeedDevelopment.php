<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Database\Seeders\DevelopmentSeeder;

class SeedDevelopment extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:seed:development 
                            {--force : Ejecutar sin confirmación}
                            {--fresh : Ejecutar con fresh migration}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ejecuta solo los seeders de desarrollo (datos de prueba)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $environment = app()->environment();
        
        // Verificar que no estemos en producción
        if (in_array($environment, ['production', 'prod'])) {
            $this->error('❌ No puedes ejecutar seeders de desarrollo en producción!');
            $this->warn('Entorno actual: ' . $environment);
            return 1;
        }
        
        $this->info('🧪 Ejecutando seeders de desarrollo...');
        $this->warn('Entorno actual: ' . $environment);
        
        if (!$this->option('force')) {
            if (!$this->confirm('¿Estás seguro de que quieres ejecutar los seeders de desarrollo?')) {
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
            
            $this->call(DevelopmentSeeder::class);
            $this->info('✅ Seeders de desarrollo ejecutados correctamente');
        } catch (\Exception $e) {
            $this->error('❌ Error al ejecutar seeders de desarrollo: ' . $e->getMessage());
            return 1;
        }
        
        return 0;
    }
}
