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
        Schema::table('purchase_order_items', function (Blueprint $table) {
            // Cambiamos 'subtotal' a un DECIMAL con 20 dígitos en total y 2 decimales.
            // Esto permite números de hasta 99,999,999,999,999,999.99
            $table->decimal('subtotal', 20, 2)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            // Esto revierte el cambio si alguna vez lo necesitas.
            // Asumimos que antes era un decimal(10, 2) o similar.
            $table->decimal('subtotal', 10, 2)->change();
        });
    }
};