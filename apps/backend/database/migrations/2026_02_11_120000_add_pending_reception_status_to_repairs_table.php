<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE repairs MODIFY COLUMN status ENUM('Pendiente de recepción','Recibido','En diagnóstico','Reparación Interna','Reparación Externa','Esperando repuestos','Terminado','Entregado','Cancelado') DEFAULT 'Pendiente de recepción'");
    }

    public function down(): void
    {
        DB::table('repairs')
            ->whereIn('status', ['Pendiente de recepción', 'Cancelado'])
            ->update(['status' => DB::raw("'Recibido'")]);

        DB::statement("ALTER TABLE repairs MODIFY COLUMN status ENUM('Recibido','En diagnóstico','Reparación Interna','Reparación Externa','Esperando repuestos','Terminado','Entregado') DEFAULT 'Recibido'");
    }
};
