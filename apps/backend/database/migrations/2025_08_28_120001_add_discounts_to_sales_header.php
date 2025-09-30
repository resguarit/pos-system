<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_header', function (Blueprint $table) {
            $table->enum('discount_type', ['percent','amount'])->nullable()->after('internal_tax');
            // Valor de descuento: entero si es monto fijo, porcentaje con hasta 2 decimales; se almacenará como decimal pero se usará como entero/porcentaje según tipo
            $table->decimal('discount_value', 10, 2)->nullable()->after('discount_type');
            // Mantener discount_amount existente para total global aplicado (guardaremos valor entero redondeado)
        });
    }

    public function down(): void
    {
        Schema::table('sales_header', function (Blueprint $table) {
            $table->dropColumn(['discount_type', 'discount_value']);
        });
    }
};
