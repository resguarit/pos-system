<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Only create if table doesn't exist
        if (!Schema::hasTable('supplier_tax_identities')) {
            Schema::create('supplier_tax_identities', function (Blueprint $table) {
                $table->id();
                $table->foreignId('supplier_id')->constrained('suppliers')->onDelete('cascade');
                $table->string('cuit', 20)->nullable();
                $table->string('business_name')->nullable()->comment('Razon Social or Alias');
                $table->foreignId('fiscal_condition_id')->nullable()->constrained('fiscal_conditions')->onDelete('set null');
                // Bank fields
                $table->string('cbu', 22)->nullable()->comment('CBU bancario');
                $table->string('cbu_alias', 50)->nullable()->comment('Alias del CBU');
                $table->string('bank_name', 100)->nullable()->comment('Nombre del banco');
                $table->string('account_holder', 255)->nullable()->comment('Titular de la cuenta');
                $table->boolean('is_default')->default(false);
                $table->timestamps();
                $table->softDeletes();

                $table->index(['supplier_id', 'is_default']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_tax_identities');
    }
};
