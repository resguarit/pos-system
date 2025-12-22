<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Usamos raw SQL para asegurar que el ENUM tenga los valores correctos y evitar problemas de truncamiento
        // si la columna estaba definida incorrectamente (ej: varchar muy corto o enum sin 'active')
        DB::statement("ALTER TABLE employees MODIFY COLUMN status ENUM('active', 'inactive', 'terminated') NOT NULL DEFAULT 'active'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No es necesario revertir a un estado "roto", pero podríamos dejarlo como estaba si supiéramos cómo.
        // Por seguridad, lo dejamos como definimos en el up.
    }
};
