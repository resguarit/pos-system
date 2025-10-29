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
        if (Schema::hasTable('sale_items')) {
            Schema::table('sale_items', function (Blueprint $table) {
                // Verificar que las columnas no existan antes de agregarlas
                if (!Schema::hasColumn('sale_items', 'combo_id')) {
                    $table->unsignedBigInteger('combo_id')->nullable();
                    // Solo agregar foreign key en producción (MySQL/PostgreSQL)
                    $driver = DB::connection()->getDriverName();
                    if (in_array($driver, ['mysql', 'pgsql'])) {
                        try {
                            $table->foreign('combo_id')->references('id')->on('combos')->onDelete('cascade');
                        } catch (\Exception $e) {
                            // Ignorar si la tabla combos no existe aún
                        }
                    }
                }
                
                if (!Schema::hasColumn('sale_items', 'is_combo')) {
                    $table->boolean('is_combo')->default(false);
                }
            });
            
            // Agregar índices (ignorar errores si ya existen)
            try {
                Schema::table('sale_items', function (Blueprint $table) {
                    $table->index(['combo_id', 'is_combo']);
                });
            } catch (\Exception $e) {
                // Ignorar errores de índices duplicados
            }
        }
    }

    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropForeign(['combo_id']);
            $table->dropColumn(['combo_id', 'is_combo']);
        });
    }
};






