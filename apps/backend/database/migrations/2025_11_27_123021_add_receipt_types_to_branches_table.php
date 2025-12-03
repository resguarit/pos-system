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
            // JSON column to store enabled receipt type IDs for this branch
            // Example: [1, 6, 11] for Factura A, Factura B, Factura C
            $table->json('enabled_receipt_types')->nullable()->after('point_of_sale');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('enabled_receipt_types');
        });
    }
};
