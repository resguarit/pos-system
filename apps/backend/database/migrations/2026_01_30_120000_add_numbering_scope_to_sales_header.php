<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Numeración contigua: ventas (fiscales y no fiscales) comparten una secuencia por sucursal;
     * presupuestos tienen secuencia propia. Este campo define el alcance de unicidad del número.
     *
     * Idempotent: safe to run when column or new unique already exist (e.g. partial previous run).
     */
    public function up(): void
    {
        if (! Schema::hasColumn('sales_header', 'numbering_scope')) {
            Schema::table('sales_header', function (Blueprint $table) {
                $table->string('numbering_scope', 20)->nullable()->after('receipt_number');
            });
        }

        // Backfill: presupuesto (016) -> 'presupuesto', resto -> 'sale'
        if (Schema::hasColumn('sales_header', 'numbering_scope')) {
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
        }

        $newIndexExists = $this->indexExists('sales_header', 'unique_receipt_per_branch_scope');
        if ($newIndexExists) {
            return;
        }

        $oldIndexExists = $this->indexExists('sales_header', 'unique_receipt_per_branch_type');
        if ($oldIndexExists) {
            // InnoDB can use the unique (branch_id, receipt_type_id, receipt_number) as the index
            // for FKs on branch_id and receipt_type_id. Create standalone indexes so we can drop the unique.
            $driver = Schema::getConnection()->getDriverName();
            if ($driver === 'mysql') {
                $this->addIndexIfNotExists('sales_header', 'branch_id', 'sales_header_numbering_scope_branch_id_idx');
                $this->addIndexIfNotExists('sales_header', 'receipt_type_id', 'sales_header_numbering_scope_receipt_type_id_idx');
            }
            Schema::table('sales_header', function (Blueprint $table) {
                $table->dropUnique('unique_receipt_per_branch_type');
            });
        }

        Schema::table('sales_header', function (Blueprint $table) {
            $table->unique(['branch_id', 'numbering_scope', 'receipt_number'], 'unique_receipt_per_branch_scope');
        });
    }

    public function down(): void
    {
        if ($this->indexExists('sales_header', 'unique_receipt_per_branch_scope')) {
            Schema::table('sales_header', function (Blueprint $table) {
                $table->dropUnique('unique_receipt_per_branch_scope');
            });
        }
        if (! $this->indexExists('sales_header', 'unique_receipt_per_branch_type')) {
            Schema::table('sales_header', function (Blueprint $table) {
                $table->unique(['branch_id', 'receipt_type_id', 'receipt_number'], 'unique_receipt_per_branch_type');
            });
        }
        if (Schema::hasColumn('sales_header', 'numbering_scope')) {
            Schema::table('sales_header', function (Blueprint $table) {
                $table->dropColumn('numbering_scope');
            });
        }
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver !== 'mysql') {
            return false;
        }
        $results = DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$indexName]);

        return ! empty($results);
    }

    /** Add a single-column index only if no other index on that column exists (except unique_receipt_per_branch_type). */
    private function addIndexIfNotExists(string $table, string $column, string $newIndexName): void
    {
        $rows = DB::select("SHOW INDEX FROM {$table} WHERE Column_name = ? AND Key_name != 'unique_receipt_per_branch_type'", [$column]);
        if (! empty($rows)) {
            return;
        }
        DB::statement("CREATE INDEX {$newIndexName} ON {$table} ({$column})");
    }
};
