<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            return;
        }
        
        DB::statement("ALTER TABLE repairs MODIFY COLUMN status ENUM('Pendiente de recepción','Recibido','En diagnóstico','Reparación Interna','Reparación Externa','Esperando repuestos','Terminado','Entregado','Cancelado') DEFAULT 'Pendiente de recepción'");
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            return;
        }
        
        DB::table('repairs')
            ->where('status', 'Cancelado')
            ->update(['status' => DB::raw("'Recibido'")]);

        DB::statement("ALTER TABLE repairs MODIFY COLUMN status ENUM('Pendiente de recepción','Recibido','En diagnóstico','Reparación Interna','Reparación Externa','Esperando repuestos','Terminado','Entregado') DEFAULT 'Pendiente de recepción'");
    }
};
