<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('client_services', function (Blueprint $table) {
            $table->decimal('amount_without_iva', 15, 2)->nullable()->after('amount');
            $table->decimal('amount_with_iva', 15, 2)->nullable()->after('amount_without_iva');
        });

        // Backfill safely from the legacy amount column to keep existing data working.
        DB::statement("UPDATE client_services SET amount_without_iva = amount WHERE amount_without_iva IS NULL");
        DB::statement("UPDATE client_services SET amount_with_iva = amount WHERE amount_with_iva IS NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('client_services', function (Blueprint $table) {
            $table->dropColumn(['amount_without_iva', 'amount_with_iva']);
        });
    }
};

