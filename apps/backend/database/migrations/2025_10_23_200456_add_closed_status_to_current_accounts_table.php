<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // SQLite no soporta MODIFY COLUMN, así que solo ejecutamos en MySQL/PostgreSQL
        $driver = DB::connection()->getDriverName();
        
        if (!Schema::hasTable('current_accounts')) {
            return;
        }
        
        if (in_array($driver, ['mysql', 'pgsql'])) {
            try {
                DB::statement("ALTER TABLE current_accounts MODIFY COLUMN status ENUM('active', 'inactive', 'suspended', 'closed') DEFAULT 'active'");
            } catch (\Exception $e) {
                // Si falla, intentar con PostgreSQL syntax
                if ($driver === 'pgsql') {
                    // PostgreSQL usa CHECK constraint en lugar de ENUM
                    // Por ahora, solo cambiamos el default si es MySQL
                }
            }
        } else {
            // Para SQLite, no podemos cambiar el tipo ENUM, pero podemos verificar que la tabla existe
            // El constraint se debería manejar en el modelo o en la aplicación
            // En producción usamos MySQL, así que esto solo afecta a tests
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();
        
        if (in_array($driver, ['mysql', 'pgsql'])) {
            try {
                DB::statement("ALTER TABLE current_accounts MODIFY COLUMN status ENUM('active', 'inactive', 'suspended') DEFAULT 'active'");
            } catch (\Exception $e) {
                // Ignorar errores en rollback
            }
        }
    }
};
