<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Database\Seeders\PaymentMethodSeeder;

class SeedPaymentMethods extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:seed:payment-methods 
                            {--force : Ejecutar sin confirmación}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ejecuta el seeder de métodos de pago (agrega/actualiza métodos de pago)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('💳 Ejecutando seeder de métodos de pago...');
        
        if (!$this->option('force')) {
            if (!$this->confirm('¿Estás seguro de que quieres ejecutar el seeder de métodos de pago?')) {
                $this->info('Operación cancelada.');
                return;
            }
        }
        
        try {
            $seeder = new PaymentMethodSeeder();
            $seeder->setCommand($this);
            $seeder->run();
            $this->info('✅ Métodos de pago actualizados correctamente');
            $this->line('   Los métodos de pago han sido agregados/actualizados en la base de datos.');
        } catch (\Exception $e) {
            $this->error('❌ Error al ejecutar seeder de métodos de pago: ' . $e->getMessage());
            return 1;
        }
        
        return 0;
    }
}

