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
        Schema::table('afip_certificates', function (Blueprint $table) {
            $table->string('iibb', 50)->nullable()->after('notes')->comment('Número de Ingresos Brutos');
            $table->date('fecha_inicio_actividades')->nullable()->after('iibb')->comment('Fecha de inicio de actividades fiscales');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('afip_certificates', function (Blueprint $table) {
            $table->dropColumn(['iibb', 'fecha_inicio_actividades']);
        });
    }
};
