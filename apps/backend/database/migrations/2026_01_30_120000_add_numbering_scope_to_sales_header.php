<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Numeración contigua: ventas (fiscales y no fiscales) comparten una secuencia por sucursal;
     * presupuestos tienen secuencia propia. Este campo define el alcance de unicidad del número.
     */
    public function up(): void
    {
        Schema::table('sales_header', function (Blueprint $table) {
            $table->string('numbering_scope', 20)->nullable()->after('receipt_number');
        });

        // Backfill: presupuesto (016) -> 'presupuesto', resto -> 'sale'
        DB::statement("
            UPDATE sales_header sh
            INNER JOIN receipt_type rt ON sh.receipt_type_id = rt.id
            SET sh.numbering_scope = IF(rt.afip_code = '016', 'presupuesto', 'sale')
        ");
        DB::table('sales_header')->whereNull('numbering_scope')->update(['numbering_scope' => 'sale']);

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE sales_header MODIFY numbering_scope VARCHAR(20) NOT NULL');
        }

        Schema::table('sales_header', function (Blueprint $table) {
            $table->dropUnique('unique_receipt_per_branch_type');
            $table->unique(['branch_id', 'numbering_scope', 'receipt_number'], 'unique_receipt_per_branch_scope');
        });
    }

    public function down(): void
    {
        Schema::table('sales_header', function (Blueprint $table) {
            $table->dropUnique('unique_receipt_per_branch_scope');
            $table->unique(['branch_id', 'receipt_type_id', 'receipt_number'], 'unique_receipt_per_branch_type');
        });
        Schema::table('sales_header', function (Blueprint $table) {
            $table->dropColumn('numbering_scope');
        });
    }
};
