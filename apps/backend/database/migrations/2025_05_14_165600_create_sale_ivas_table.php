<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_ivas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_header_id')->constrained('sales_header')->onDelete('cascade');
            $table->foreignId('iva_id')->constrained('ivas'); // FK a tu tabla de tipos de IVA
            $table->decimal('base_amount', 15, 3); // Base imponible para este tipo de IVA en la venta
            $table->decimal('iva_amount', 15, 3);  // Monto total de este tipo de IVA en la venta
            $table->timestamps();

            $table->unique(['sale_header_id', 'iva_id']); // Una venta solo debe tener una entrada por tipo de IVA
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_ivas');
    }
};
