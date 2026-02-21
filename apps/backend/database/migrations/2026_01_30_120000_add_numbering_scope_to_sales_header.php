<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Numeración contigua: ventas (fiscales y no fiscales) comparten una secuencia por sucursal;
     * presupuestos tienen secuencia propia. Este campo define el alcance de unicidad del número.
     *
     * Idempotent: safe to run when column or new unique already exist (e.g. partial previous run).
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (!Schema::hasColumn('sales_header', 'numbering_scope')) {
            Schema::table('sales_header', function (Blueprint $table) {
                $table->string('numbering_scope', 20)->nullable()->after('receipt_number');
            });
        }

        // Backfill: presupuesto (016) -> 'presupuesto'; resto -> 'sale_{receipt_type_id}' para evitar
        // duplicados si ya existían números por tipo (antes era único por branch+receipt_type+number).
        if (Schema::hasColumn('sales_header', 'numbering_scope')) {
            if ($driver === 'sqlite') {
                DB::statement("
                    UPDATE sales_header
                    SET numbering_scope = CASE
                        WHEN (
                            SELECT afip_code
                            FROM receipt_type
                            WHERE receipt_type.id = sales_header.receipt_type_id
                        ) = '016' THEN 'presupuesto'
                        ELSE 'sale_' || sales_header.receipt_type_id
                    END
                ");
            } else {
                DB::statement("
                    UPDATE sales_header sh
                    INNER JOIN receipt_type rt ON sh.receipt_type_id = rt.id
                    SET sh.numbering_scope = IF(rt.afip_code = '016', 'presupuesto', CONCAT('sale_', sh.receipt_type_id))
                ");
            }

            DB::table('sales_header')->whereNull('numbering_scope')->update(['numbering_scope' => 'sale']);

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

        // Repair: si quedaron filas con numbering_scope = 'sale' (backfill viejo), convertirlas a sale_{type_id}
        // para que (branch_id, numbering_scope, receipt_number) sea único antes de crear el índice.
        if ($driver === 'sqlite') {
            DB::statement("
                UPDATE sales_header
                SET numbering_scope = 'sale_' || receipt_type_id
                WHERE numbering_scope = 'sale'
                AND (
                    (
                        SELECT afip_code
                        FROM receipt_type
                        WHERE receipt_type.id = sales_header.receipt_type_id
                    ) IS NULL
                    OR (
                        SELECT afip_code
                        FROM receipt_type
                        WHERE receipt_type.id = sales_header.receipt_type_id
                    ) != '016'
                )
            ");
        } else {
            DB::statement("
                UPDATE sales_header sh
                INNER JOIN receipt_type rt ON sh.receipt_type_id = rt.id
                SET sh.numbering_scope = CONCAT('sale_', sh.receipt_type_id)
                WHERE sh.numbering_scope = 'sale' AND (rt.afip_code IS NULL OR rt.afip_code != '016')
            ");
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
        if (!$this->indexExists('sales_header', 'unique_receipt_per_branch_type')) {
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

        return !empty($results);
    }

    /** Add a single-column index only if no other index on that column exists (except unique_receipt_per_branch_type). */
    private function addIndexIfNotExists(string $table, string $column, string $newIndexName): void
    {
        $rows = DB::select("SHOW INDEX FROM {$table} WHERE Column_name = ? AND Key_name != 'unique_receipt_per_branch_type'", [$column]);
        if (!empty($rows)) {
            return;
        }
        DB::statement("CREATE INDEX {$newIndexName} ON {$table} ({$column})");
    }
};
