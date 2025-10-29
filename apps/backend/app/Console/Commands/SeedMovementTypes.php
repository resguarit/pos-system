<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Database\Seeders\MovementTypeSeeder;

class SeedMovementTypes extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:seed:movement-types 
                            {--force : Ejecutar sin confirmación}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ejecuta el seeder de tipos de movimiento (agrega/actualiza tipos de movimiento)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('💸 Ejecutando seeder de tipos de movimiento...');
        
        if (!$this->option('force')) {
            if (!$this->confirm('¿Estás seguro de que quieres ejecutar el seeder de tipos de movimiento?')) {
                $this->info('Operación cancelada.');
                return;
            }
        }
        
        try {
            $seeder = new MovementTypeSeeder();
            $seeder->setCommand($this);
            $seeder->run();
            $this->info('✅ Tipos de movimiento actualizados correctamente');
            $this->line('   Los tipos de movimiento han sido agregados/actualizados en la base de datos.');
        } catch (\Exception $e) {
            $this->error('❌ Error al ejecutar seeder de tipos de movimiento: ' . $e->getMessage());
            return 1;
        }
        
        return 0;
    }
}

