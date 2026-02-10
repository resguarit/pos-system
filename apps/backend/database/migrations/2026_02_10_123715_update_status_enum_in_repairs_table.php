<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE repairs MODIFY COLUMN status ENUM('Recibido','En diagnóstico','Reparación Interna','Reparación Externa','Esperando repuestos','Terminado','Entregado') DEFAULT 'Recibido'");

        // Update any existing rows that had the old value
        DB::table('repairs')
            ->where('status', 'En reparación')
            ->update(['status' => DB::raw("'Reparación Interna'")]);
    }

    public function down(): void
    {
        // Revert back to old enum
        DB::table('repairs')
            ->whereIn('status', ['Reparación Interna', 'Reparación Externa'])
            ->update(['status' => DB::raw("'En reparación'")]);

        DB::statement("ALTER TABLE repairs MODIFY COLUMN status ENUM('Recibido','En diagnóstico','En reparación','Esperando repuestos','Terminado','Entregado') DEFAULT 'Recibido'");
    }
};
