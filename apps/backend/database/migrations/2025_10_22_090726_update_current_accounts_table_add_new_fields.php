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
            // Agregar nuevos campos
            $table->timestamp('opened_at')->nullable()->after('notes');
            $table->timestamp('closed_at')->nullable()->after('opened_at');
            $table->timestamp('last_movement_at')->nullable()->after('closed_at');
            
            // Agregar soft deletes si no existe
            if (!Schema::hasColumn('current_accounts', 'deleted_at')) {
                $table->softDeletes();
            }
            
            // Agregar índices para mejorar el rendimiento
            $table->index(['customer_id', 'status']);
            $table->index(['status', 'current_balance']);
            $table->index('last_movement_at');
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