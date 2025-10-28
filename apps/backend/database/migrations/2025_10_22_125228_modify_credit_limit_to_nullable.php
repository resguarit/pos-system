<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Solo ejecutar si las tablas y columnas existen
        if (Schema::hasTable('people') && Schema::hasColumn('people', 'credit_limit')) {
            try {
                Schema::table('people', function (Blueprint $table) {
                    // Cambiar credit_limit para permitir NULL (límite infinito)
                    $table->decimal('credit_limit', 12, 2)->nullable()->change();
                });
            } catch (\Exception $e) {
                // Ya es nullable o error, ignorar
            }
        }
        
        if (Schema::hasTable('current_accounts') && Schema::hasColumn('current_accounts', 'credit_limit')) {
            try {
                Schema::table('current_accounts', function (Blueprint $table) {
                    // Cambiar credit_limit para permitir NULL (límite infinito)
                    $table->decimal('credit_limit', 12, 2)->nullable()->change();
                });
            } catch (\Exception $e) {
                // Ya es nullable o error, ignorar
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('people', function (Blueprint $table) {
            // Revertir a default(0)
            $table->decimal('credit_limit', 12, 2)->default(0)->change();
        });
        
        Schema::table('current_accounts', function (Blueprint $table) {
            // Revertir a default(0)
            $table->decimal('credit_limit', 12, 2)->default(0)->change();
        });
    }
};