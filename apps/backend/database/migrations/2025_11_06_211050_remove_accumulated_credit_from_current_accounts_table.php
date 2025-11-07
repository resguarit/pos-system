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
            // Eliminar columna accumulated_credit ya que se eliminó la funcionalidad de crédito a favor
            if (Schema::hasColumn('current_accounts', 'accumulated_credit')) {
                $table->dropColumn('accumulated_credit');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('current_accounts', function (Blueprint $table) {
            // Restaurar columna accumulated_credit si se necesita revertir
            if (!Schema::hasColumn('current_accounts', 'accumulated_credit')) {
                $table->decimal('accumulated_credit', 15, 2)->default(0)->after('current_balance');
            }
        });
    }
};
