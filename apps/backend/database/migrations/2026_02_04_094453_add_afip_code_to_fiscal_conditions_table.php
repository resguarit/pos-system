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
        Schema::table('fiscal_conditions', function (Blueprint $table) {
            $table->string('afip_code', 10)->nullable()->after('description')->comment('Código AFIP condición IVA: 1=RI, 4=Exento, 5=CF, 6=Monotrib');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fiscal_conditions', function (Blueprint $table) {
            $table->dropColumn('afip_code');
        });
    }
};
