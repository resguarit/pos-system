<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * 
     * Agrega campo para configurar restricciones de horario de acceso por rol.
     * Ejemplo de estructura JSON:
     * {
     *   "enabled": true,
     *   "timezone": "America/Argentina/Buenos_Aires",
     *   "days": [1, 2, 3, 4, 5],  // 1=Lunes, 7=Domingo
     *   "start_time": "08:00",
     *   "end_time": "18:00"
     * }
     */
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->json('access_schedule')->nullable()->after('active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn('access_schedule');
        });
    }
};
