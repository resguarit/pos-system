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
        Schema::table('repairs', function (Blueprint $table) {
            // Add no_repair fields if they don't exist
            if (!Schema::hasColumn('repairs', 'no_repair_reason')) {
                if (Schema::hasColumn('repairs', 'diagnosis')) {
                    $table->text('no_repair_reason')->nullable()->after('diagnosis');
                } else {
                    $table->text('no_repair_reason')->nullable();
                }
            }
            if (!Schema::hasColumn('repairs', 'no_repair_at')) {
                $table->timestamp('no_repair_at')->nullable()->after('delivered_at');
            }
            // Add is_no_repair boolean field
            if (!Schema::hasColumn('repairs', 'is_no_repair')) {
                $table->boolean('is_no_repair')->default(false)->after('status');
            }
        });

        // Migrate existing "Sin reparación" status to the boolean flag
        DB::statement("UPDATE repairs SET is_no_repair = true WHERE status = 'Sin reparación'");

        // Change status back to valid statuses for repairs that were marked as no-repair
        DB::statement("UPDATE repairs SET status = 'Terminado' WHERE status = 'Sin reparación'");

        // Update the ENUM to remove "Sin reparación"
        DB::statement("ALTER TABLE repairs MODIFY COLUMN status ENUM(
            'Pendiente de recepción',
            'Recibido',
            'En diagnóstico',
            'Reparación Interna',
            'Reparación Externa',
            'Esperando repuestos',
            'Terminado',
            'Entregado',
            'Cancelado'
        ) NOT NULL DEFAULT 'Pendiente de recepción'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Add back the "Sin reparación" status to the ENUM
        DB::statement("ALTER TABLE repairs MODIFY COLUMN status ENUM(
            'Pendiente de recepción',
            'Recibido',
            'En diagnóstico',
            'Reparación Interna',
            'Reparación Externa',
            'Esperando repuestos',
            'Terminado',
            'Entregado',
            'Cancelado',
            'Sin reparación'
        ) NOT NULL DEFAULT 'Pendiente de recepción'");

        // Restore repairs that had is_no_repair = true to "Sin reparación" status
        DB::statement("UPDATE repairs SET status = 'Sin reparación' WHERE is_no_repair = true");

        // Remove the is_no_repair field
        Schema::table('repairs', function (Blueprint $table) {
            if (Schema::hasColumn('repairs', 'is_no_repair')) {
                $table->dropColumn('is_no_repair');
            }
            if (Schema::hasColumn('repairs', 'no_repair_at')) {
                $table->dropColumn('no_repair_at');
            }
            if (Schema::hasColumn('repairs', 'no_repair_reason')) {
                $table->dropColumn('no_repair_reason');
            }
        });
    }
};

