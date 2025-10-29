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
        // SQLite no soporta alias en UPDATE ni subconsultas complejas, así que hacemos una migración por lotes
        $driver = DB::connection()->getDriverName();
        
        if (in_array($driver, ['mysql', 'pgsql'])) {
            // Para MySQL y PostgreSQL, usar alias
            try {
                DB::statement("
                    UPDATE purchase_orders po 
                    SET currency = (
                        SELECT COALESCE(p.currency, 'ARS') 
                        FROM purchase_order_items poi 
                        JOIN products p ON p.id = poi.product_id 
                        WHERE poi.purchase_order_id = po.id 
                        LIMIT 1
                    )
                    WHERE (po.currency IS NULL OR po.currency = '')
                    AND EXISTS (
                        SELECT 1 FROM purchase_order_items poi2
                        JOIN products p2 ON p2.id = poi2.product_id
                        WHERE poi2.purchase_order_id = po.id
                    )
                ");
            } catch (\Exception $e) {
                // Si falla, hacer migración por lotes (para SQLite compatible)
                $this->migrateCurrencyInBatches();
            }
        } else {
            // Para SQLite, hacer migración por lotes
            $this->migrateCurrencyInBatches();
        }
    }

    /**
     * Migrar currency por lotes (compatible con SQLite)
     */
    private function migrateCurrencyInBatches(): void
    {
        if (!Schema::hasTable('purchase_orders') || !Schema::hasTable('purchase_order_items') || !Schema::hasTable('products')) {
            return;
        }
        
        $orders = DB::table('purchase_orders')
            ->where(function($query) {
                $query->whereNull('currency')->orWhere('currency', '');
            })
            ->get();
        
        foreach ($orders as $order) {
            $firstProduct = DB::table('purchase_order_items')
                ->join('products', 'products.id', '=', 'purchase_order_items.product_id')
                ->where('purchase_order_items.purchase_order_id', $order->id)
                ->select('products.currency')
                ->first();
            
            if ($firstProduct) {
                DB::table('purchase_orders')
                    ->where('id', $order->id)
                    ->update(['currency' => $firstProduct->currency ?? 'ARS']);
            } else {
                DB::table('purchase_orders')
                    ->where('id', $order->id)
                    ->update(['currency' => 'ARS']);
            }
        }
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
