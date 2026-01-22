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
        Schema::table('customer_tax_identities', function (Blueprint $table) {
            $table->string('cbu', 22)->nullable()->after('fiscal_condition_id')->comment('CBU bancario');
            $table->string('cbu_alias', 50)->nullable()->after('cbu')->comment('Alias del CBU');
            $table->string('bank_name', 100)->nullable()->after('cbu_alias')->comment('Nombre del banco');
            $table->string('account_holder', 255)->nullable()->after('bank_name')->comment('Titular de la cuenta');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customer_tax_identities', function (Blueprint $table) {
            $table->dropColumn(['cbu', 'cbu_alias', 'bank_name', 'account_holder']);
        });
    }
};
