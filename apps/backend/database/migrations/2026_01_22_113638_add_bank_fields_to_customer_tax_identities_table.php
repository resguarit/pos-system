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
        // Solo agregar campos si la tabla existe (será creada por otra migración)
        if (!Schema::hasTable('customer_tax_identities')) {
            return;
        }

        Schema::table('customer_tax_identities', function (Blueprint $table) {
            if (!Schema::hasColumn('customer_tax_identities', 'cbu')) {
                $table->string('cbu', 22)->nullable()->after('fiscal_condition_id')->comment('CBU bancario');
            }
            if (!Schema::hasColumn('customer_tax_identities', 'cbu_alias')) {
                $table->string('cbu_alias', 50)->nullable()->after('cbu')->comment('Alias del CBU');
            }
            if (!Schema::hasColumn('customer_tax_identities', 'bank_name')) {
                $table->string('bank_name', 100)->nullable()->after('cbu_alias')->comment('Nombre del banco');
            }
            if (!Schema::hasColumn('customer_tax_identities', 'account_holder')) {
                $table->string('account_holder', 255)->nullable()->after('bank_name')->comment('Titular de la cuenta');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('customer_tax_identities')) {
            return;
        }

        Schema::table('customer_tax_identities', function (Blueprint $table) {
            $columns = ['cbu', 'cbu_alias', 'bank_name', 'account_holder'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('customer_tax_identities', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
