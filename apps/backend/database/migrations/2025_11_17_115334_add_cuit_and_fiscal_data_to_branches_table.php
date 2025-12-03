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
        Schema::table('branches', function (Blueprint $table) {
            $table->string('cuit', 11)->nullable()->after('email');
            $table->string('razon_social')->nullable()->after('cuit');
            $table->string('iibb')->nullable()->after('razon_social');
            $table->date('start_date')->nullable()->after('iibb');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn(['cuit', 'razon_social', 'iibb', 'start_date']);
        });
    }
};
