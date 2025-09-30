<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * Ejecuta seeders específicos según el entorno de la aplicación.
     */
    public function run(): void
    {
        $environment = app()->environment();
        
        $this->command->info("🚀 Iniciando seeding para entorno: {$environment}");
        
        // Siempre ejecutar seeders de producción (datos esenciales)
        $this->call(ProductionSeeder::class);
        
        // Solo ejecutar seeders de desarrollo en entornos locales
        if ($this->shouldRunDevelopmentSeeders()) {
            $this->call(DevelopmentSeeder::class);
        } else {
            $this->command->warn('⚠️  Saltando seeders de desarrollo (solo para entornos locales)');
        }
        
        $this->command->info('✅ Seeding completado');
    }
    
    /**
     * Determina si se deben ejecutar los seeders de desarrollo.
     */
    private function shouldRunDevelopmentSeeders(): bool
    {
        $environment = app()->environment();
        
        // Ejecutar en desarrollo local
        if (in_array($environment, ['local', 'development', 'testing'])) {
            return true;
        }
        
        // Ejecutar si se fuerza con una variable de entorno
        if (env('FORCE_DEVELOPMENT_SEEDERS', false)) {
            return true;
        }
        
        // Ejecutar si se pasa el flag --dev
        if ($this->command->option('dev')) {
            return true;
        }
        
        return false;
    }
}
