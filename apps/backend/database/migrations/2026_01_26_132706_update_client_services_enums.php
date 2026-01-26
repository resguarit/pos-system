<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('client_services', function (Blueprint $table) {
            $table->enum('billing_cycle', ['monthly', 'quarterly', 'annual', 'biennial', 'one_time'])->change();
            $table->enum('next_billing_cycle', ['monthly', 'quarterly', 'annual', 'biennial', 'one_time'])->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('client_services', function (Blueprint $table) {
            // Cannot easily revert enum Change in SQLite/some DBs without dropping, but for now we leave as is
        });
    }
};
