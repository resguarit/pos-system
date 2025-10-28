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
        Schema::table('current_account_movements', function (Blueprint $table) {
            // Agregar nuevos campos
            $table->unsignedBigInteger('user_id')->nullable()->after('metadata');
            $table->timestamp('movement_date')->nullable()->after('user_id');
            
            // Agregar soft deletes si no existe
            if (!Schema::hasColumn('current_account_movements', 'deleted_at')) {
                $table->softDeletes();
            }
            
            // Agregar foreign key para user_id
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            
            // Agregar índices para mejorar el rendimiento
            $table->index(['current_account_id', 'movement_date']);
            $table->index(['movement_type_id', 'movement_date']);
            $table->index(['user_id', 'movement_date']);
            $table->index('movement_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('current_account_movements', function (Blueprint $table) {
            // Eliminar foreign key
            $table->dropForeign(['user_id']);
            
            // Eliminar índices
            $table->dropIndex(['current_account_id', 'movement_date']);
            $table->dropIndex(['movement_type_id', 'movement_date']);
            $table->dropIndex(['user_id', 'movement_date']);
            $table->dropIndex(['movement_date']);
            
            // Eliminar campos
            $table->dropColumn(['user_id', 'movement_date']);
            
            // Eliminar soft deletes si existe
            if (Schema::hasColumn('current_account_movements', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};