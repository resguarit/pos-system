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
            // Agregar soft deletes solo si no existe
            if (!Schema::hasColumn('current_accounts', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('current_accounts', function (Blueprint $table) {
            // Eliminar soft deletes solo si existe
            if (Schema::hasColumn('current_accounts', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};
