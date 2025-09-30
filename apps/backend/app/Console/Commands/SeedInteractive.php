<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Database\Seeders\ProductionSeeder;
use Database\Seeders\DevelopmentSeeder;

class SeedInteractive extends Command
{
    protected $signature = 'db:seed:interactive';
    protected $description = 'Ejecuta seeders con confirmaciones interactivas';

    public function handle()
    {
        $this->info('🚀 Configuración Interactiva de Base de Datos');
        $this->line('==========================================');
        
        // Confirmación inicial
        if (!$this->confirm('¿Quieres configurar la base de datos desde cero?')) {
            $this->info('Operación cancelada.');
            return;
        }
        
        // Preguntar sobre migraciones
        if ($this->confirm('¿Ejecutar migraciones fresh? (elimina todos los datos)', false)) {
            $this->info('🔄 Ejecutando migraciones fresh...');
            $this->call('migrate:fresh');
        }
        
        // Preguntar sobre seeders de producción
        if ($this->confirm('¿Ejecutar seeders de producción? (datos esenciales)', true)) {
            $this->info('🏭 Ejecutando seeders de producción...');
            $this->call(ProductionSeeder::class);
        }
        
        // Preguntar sobre seeders de desarrollo
        if ($this->confirm('¿Ejecutar seeders de desarrollo? (datos de prueba)', false)) {
            $this->info('🧪 Ejecutando seeders de desarrollo...');
            $this->call(DevelopmentSeeder::class);
        }
        
        $this->info('✅ Configuración completada');
    }
}
