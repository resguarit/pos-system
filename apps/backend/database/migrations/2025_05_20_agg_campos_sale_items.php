<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->decimal('unit_price', 15, 3)->after('quantity');
            $table->decimal('iva_rate', 5, 2)->after('unit_price');
            $table->decimal('item_subtotal', 15, 3)->after('iva_rate');
            $table->decimal('item_iva', 15, 3)->after('item_subtotal');
            $table->decimal('item_total', 15, 3)->after('item_iva');
        });
    }

    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn(['unit_price', 'iva_rate', 'item_subtotal', 'item_iva', 'item_total']);
        });
    }
};
