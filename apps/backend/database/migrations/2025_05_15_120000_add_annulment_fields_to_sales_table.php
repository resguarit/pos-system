<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Solo ejecutar si la tabla existe (para evitar errores en tests)
        if (Schema::hasTable('sales_header')) {
            Schema::table('sales_header', function (Blueprint $table) {
                // Verificar que las columnas no existan antes de agregarlas
                // Nota: No usamos ->after() porque SQLite no lo soporta
                if (!Schema::hasColumn('sales_header', 'status')) {
                    $table->string('status', 20)->default('active');
                }
                
                if (!Schema::hasColumn('sales_header', 'annulled_at')) {
                    $table->timestamp('annulled_at')->nullable();
                }
                
                if (!Schema::hasColumn('sales_header', 'annulled_by')) {
                    $table->unsignedBigInteger('annulled_by')->nullable();
                    // Solo agregar foreign key en producción (MySQL/PostgreSQL)
                    $driver = DB::connection()->getDriverName();
                    if (in_array($driver, ['mysql', 'pgsql'])) {
                        $table->foreign('annulled_by')->references('id')->on('users');
                    }
                }
                
                if (!Schema::hasColumn('sales_header', 'annulment_reason')) {
                    $table->text('annulment_reason')->nullable();
                }
            });
            
            // Agregar índices (ignorar errores si ya existen)
            try {
                Schema::table('sales_header', function (Blueprint $table) {
                    $table->index(['status', 'date']);
                    $table->index(['annulled_by', 'annulled_at']);
                });
            } catch (\Exception $e) {
                // Ignorar errores de índices duplicados (puede ocurrir en SQLite)
            }
        }
    }

    public function down(): void
    {
        Schema::table('sales_header', function (Blueprint $table) {
            $table->dropIndex(['status', 'date']);
            $table->dropIndex(['annulled_by', 'annulled_at']);
            
            $table->dropForeign(['annulled_by']);
            $table->dropColumn([
                'status',
                'annulled_at',
                'annulled_by',
                'annulment_reason'
            ]);
        });
    }
};
