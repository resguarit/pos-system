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
        Schema::table('current_accounts', function (Blueprint $table) {
            // Verificar y agregar campos solo si no existen
            if (!Schema::hasColumn('current_accounts', 'opened_at')) {
                $table->timestamp('opened_at')->nullable()->after('notes');
            }
            
            if (!Schema::hasColumn('current_accounts', 'closed_at')) {
                $table->timestamp('closed_at')->nullable()->after('opened_at');
            }
            
            if (!Schema::hasColumn('current_accounts', 'last_movement_at')) {
                $table->timestamp('last_movement_at')->nullable()->after('closed_at');
            }
        });
        
        // Agregar índices solo si no existen
        Schema::table('current_accounts', function (Blueprint $table) {
            // Verificar e índice de customer_id + status
            $columns = Schema::getColumnListing('current_accounts');
            if (!in_array('customer_id', $columns) || Schema::hasIndex('current_accounts', 'current_accounts_customer_id_status_index') === false) {
                try {
                    $table->index(['customer_id', 'status']);
                } catch (\Exception $e) {
                    // Índice ya existe, ignorar
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('current_accounts', function (Blueprint $table) {
            // Eliminar índices
            $table->dropIndex(['customer_id', 'status']);
            $table->dropIndex(['status', 'current_balance']);
            $table->dropIndex(['last_movement_at']);
            
            // Eliminar campos
            $table->dropColumn(['opened_at', 'closed_at', 'last_movement_at']);
            
            // Eliminar soft deletes si existe
            if (Schema::hasColumn('current_accounts', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};