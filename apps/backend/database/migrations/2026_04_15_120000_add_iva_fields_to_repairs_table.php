<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('repairs', function (Blueprint $table) {
            if (!Schema::hasColumn('repairs', 'sale_price_without_iva')) {
                $table->decimal('sale_price_without_iva', 12, 2)
                    ->nullable()
                    ->after('sale_price');
            }

            if (!Schema::hasColumn('repairs', 'iva_percentage')) {
                $table->decimal('iva_percentage', 5, 2)
                    ->default(21.00)
                    ->after('sale_price_without_iva');
            }

            if (!Schema::hasColumn('repairs', 'sale_price_with_iva')) {
                $table->decimal('sale_price_with_iva', 12, 2)
                    ->nullable()
                    ->after('iva_percentage');
            }

            if (!Schema::hasColumn('repairs', 'charge_with_iva')) {
                $table->boolean('charge_with_iva')
                    ->default(true)
                    ->after('sale_price_with_iva');
            }
        });

        // Compatibilidad histórica: se asume que sale_price existente es bruto (con IVA).
        DB::statement('UPDATE repairs SET iva_percentage = COALESCE(iva_percentage, 21.00), charge_with_iva = COALESCE(charge_with_iva, 1)');

        DB::statement(
            'UPDATE repairs
             SET
                sale_price_with_iva = COALESCE(sale_price_with_iva, sale_price),
                sale_price_without_iva = COALESCE(
                    sale_price_without_iva,
                    CASE
                        WHEN sale_price IS NULL THEN NULL
                        ELSE ROUND(sale_price / (1 + (COALESCE(iva_percentage, 21.00) / 100)), 2)
                    END
                )
             WHERE sale_price IS NOT NULL'
        );

        // Mantener campo legacy en transición como equivalente al bruto.
        DB::statement('UPDATE repairs SET sale_price = sale_price_with_iva WHERE sale_price_with_iva IS NOT NULL');
    }

    public function down(): void
    {
        Schema::table('repairs', function (Blueprint $table) {
            if (Schema::hasColumn('repairs', 'charge_with_iva')) {
                $table->dropColumn('charge_with_iva');
            }

            if (Schema::hasColumn('repairs', 'sale_price_with_iva')) {
                $table->dropColumn('sale_price_with_iva');
            }

            if (Schema::hasColumn('repairs', 'iva_percentage')) {
                $table->dropColumn('iva_percentage');
            }

            if (Schema::hasColumn('repairs', 'sale_price_without_iva')) {
                $table->dropColumn('sale_price_without_iva');
            }
        });
    }
};
