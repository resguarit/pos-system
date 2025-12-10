<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     * 
     * Modifica la columna status para soportar los estados de aprobación de ventas.
     * Los valores posibles son:
     * - active: venta activa y aprobada (default)
     * - annulled: venta anulada
     * - pending: venta pendiente de aprobación
     * - rejected: venta rechazada
     */
    public function up(): void
    {
        // Modificar la columna status para soportar los nuevos valores
        // Usamos string en lugar de enum para mayor flexibilidad
        Schema::table('sales_header', function (Blueprint $table) {
            $table->string('status', 50)->default('active')->change();
        });

        // Agregar columnas de aprobación si no existen
        Schema::table('sales_header', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_header', 'approved_by')) {
                $table->unsignedBigInteger('approved_by')->nullable()->after('status');
                $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
            }

            if (!Schema::hasColumn('sales_header', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('approved_by');
            }

            if (!Schema::hasColumn('sales_header', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable()->after('approved_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revertir a varchar(20)
        Schema::table('sales_header', function (Blueprint $table) {
            $table->string('status', 20)->default('active')->change();
        });
    }
};
