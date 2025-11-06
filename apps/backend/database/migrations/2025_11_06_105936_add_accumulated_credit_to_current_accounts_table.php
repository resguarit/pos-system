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
            // Campo para acumular crédito por bonificaciones/ajustes a favor
            // Este crédito es "consumible" - se puede usar una sola vez para pagar
            // NO se regenera cuando se usa (evita crédito infinito)
            $table->decimal('accumulated_credit', 15, 2)->default(0)->after('current_balance');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('current_accounts', function (Blueprint $table) {
            $table->dropColumn('accumulated_credit');
        });
    }
};
