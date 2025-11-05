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
        Schema::table('sales_header', function (Blueprint $table) {
            // Agregar índice único compuesto para evitar números de comprobante duplicados
            // El número debe ser único por sucursal y tipo de comprobante
            $table->unique(['branch_id', 'receipt_type_id', 'receipt_number'], 'unique_receipt_per_branch_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_header', function (Blueprint $table) {
            $table->dropUnique('unique_receipt_per_branch_type');
        });
    }
};



