<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            // Agregar campo currency con valor por defecto ARS
            $table->string('currency', 3)->default('ARS')->after('supplier_id');
            
            // Agregar índice para mejorar performance en consultas por moneda
            $table->index('currency', 'idx_purchase_orders_currency');
        });
        
        // Migrar datos existentes: establecer currency basado en el primer producto de cada orden
        DB::statement("
            UPDATE purchase_orders po 
            SET currency = (
                SELECT COALESCE(p.currency, 'ARS') 
                FROM purchase_order_items poi 
                JOIN products p ON p.id = poi.product_id 
                WHERE poi.purchase_order_id = po.id 
                LIMIT 1
            )
            WHERE po.currency IS NULL OR po.currency = ''
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropIndex('idx_purchase_orders_currency');
            $table->dropColumn('currency');
        });
    }
};
