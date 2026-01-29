<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Domicilio comercial para facturación electrónica (aparece en PDFs).
     */
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->string('domicilio_comercial', 500)->nullable()->after('razon_social');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('domicilio_comercial');
        });
    }
};
