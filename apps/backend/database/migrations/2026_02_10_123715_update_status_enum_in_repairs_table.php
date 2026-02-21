<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Check if running on SQLite (used in tests)
        if (DB::connection()->getDriverName() === 'sqlite') {
            // SQLite doesn't support ENUM or MODIFY COLUMN, skip
            return;
        }

        DB::statement("ALTER TABLE repairs MODIFY COLUMN status ENUM('Recibido','En diagnóstico','Reparación Interna','Reparación Externa','Esperando repuestos','Terminado','Entregado') DEFAULT 'Recibido'");

        // Update any existing rows that had the old value
        DB::table('repairs')
            ->where('status', 'En reparación')
            ->update(['status' => DB::raw("'Reparación Interna'")]);
    }

    public function down(): void
    {
        // Check if running on SQLite (used in tests)
        if (DB::connection()->getDriverName() === 'sqlite') {
            return;
        }

        // Revert back to old enum
        DB::table('repairs')
            ->whereIn('status', ['Reparación Interna', 'Reparación Externa'])
            ->update(['status' => DB::raw("'En reparación'")]);

        DB::statement("ALTER TABLE repairs MODIFY COLUMN status ENUM('Recibido','En diagnóstico','En reparación','Esperando repuestos','Terminado','Entregado') DEFAULT 'Recibido'");
    }
};
