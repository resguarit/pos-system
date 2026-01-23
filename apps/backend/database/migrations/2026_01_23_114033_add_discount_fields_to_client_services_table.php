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
        Schema::table('client_services', function (Blueprint $table) {
            // Precio base del tipo de servicio (para referencia)
            $table->decimal('base_price', 15, 2)->nullable()->after('amount');
            // Porcentaje de descuento aplicado a este cliente
            $table->decimal('discount_percentage', 5, 2)->default(0)->after('base_price');
            // Notas sobre el descuento o condiciones especiales
            $table->text('discount_notes')->nullable()->after('discount_percentage');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('client_services', function (Blueprint $table) {
            $table->dropColumn(['base_price', 'discount_percentage', 'discount_notes']);
        });
    }
};
