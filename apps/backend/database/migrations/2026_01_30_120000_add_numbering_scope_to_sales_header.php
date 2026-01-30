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
            try {
                Schema::table('sales_header', function (Blueprint $table) {
                    $table->dropUnique('unique_receipt_per_branch_type');
                });
            } catch (QueryException $e) {
                if (str_contains($e->getMessage(), 'foreign key') || $e->getCode() === '42000') {
                    throw new \RuntimeException(
                        'Cannot drop index unique_receipt_per_branch_type: it is required by a foreign key. '
                        . 'Find the table that references sales_header(branch_id, receipt_type_id, receipt_number), '
                        . 'drop that foreign key, then re-run migrations.',
                        0,
                        $e
                    );
                }
                throw $e;
            }
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
};
