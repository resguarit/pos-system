<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Añade UNIQUE(product_id, branch_id) para evitar filas duplicadas y
     * permitir manejo de concurrencia en getOrCreateStockLocked (StockService).
     *
     * Si ya existen duplicados, hay que consolidarlos antes de ejecutar esta migración.
     */
    public function up(): void
    {
        Schema::table('stocks', function (Blueprint $table) {
            $table->unique(['product_id', 'branch_id'], 'stocks_product_branch_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stocks', function (Blueprint $table) {
            $table->dropUnique('stocks_product_branch_unique');
        });
    }
};
