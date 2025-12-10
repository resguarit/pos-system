<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * 
     * Agrega campos para rastrear la conversión de presupuestos a ventas
     */
    public function up(): void
    {
        Schema::table('sales_header', function (Blueprint $table) {
            // Campo para referenciar el presupuesto original
            if (!Schema::hasColumn('sales_header', 'converted_from_budget_id')) {
                $table->unsignedBigInteger('converted_from_budget_id')->nullable()->after('status');
                $table->foreign('converted_from_budget_id')
                    ->references('id')
                    ->on('sales_header')
                    ->onDelete('set null');
            }

            // Campo para referenciar la venta creada (en el presupuesto original)
            if (!Schema::hasColumn('sales_header', 'converted_to_sale_id')) {
                $table->unsignedBigInteger('converted_to_sale_id')->nullable()->after('converted_from_budget_id');
                $table->foreign('converted_to_sale_id')
                    ->references('id')
                    ->on('sales_header')
                    ->onDelete('set null');
            }

            // Fecha de conversión
            if (!Schema::hasColumn('sales_header', 'converted_at')) {
                $table->timestamp('converted_at')->nullable()->after('converted_to_sale_id');
            }

            // Usuario que convirtió
            if (!Schema::hasColumn('sales_header', 'converted_by')) {
                $table->unsignedBigInteger('converted_by')->nullable()->after('converted_at');
                $table->foreign('converted_by')
                    ->references('id')
                    ->on('users')
                    ->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_header', function (Blueprint $table) {
            // Eliminar foreign keys primero
            $table->dropForeign(['converted_from_budget_id']);
            $table->dropForeign(['converted_to_sale_id']);
            $table->dropForeign(['converted_by']);

            // Eliminar columnas
            $table->dropColumn([
                'converted_from_budget_id',
                'converted_to_sale_id',
                'converted_at',
                'converted_by',
            ]);
        });
    }
};
