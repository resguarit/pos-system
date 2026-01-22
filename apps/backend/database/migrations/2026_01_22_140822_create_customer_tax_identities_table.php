<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Only create if table doesn't exist
        if (!Schema::hasTable('customer_tax_identities')) {
            Schema::create('customer_tax_identities', function (Blueprint $table) {
                $table->id();
                $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
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

                $table->index(['customer_id', 'is_default']);
            });
        } else {
            // Table exists - check if we need to rename alias to business_name
            if (Schema::hasColumn('customer_tax_identities', 'alias') && !Schema::hasColumn('customer_tax_identities', 'business_name')) {
                Schema::table('customer_tax_identities', function (Blueprint $table) {
                    $table->renameColumn('alias', 'business_name');
                });
            }
            // Add business_name if neither alias nor business_name exists
            if (!Schema::hasColumn('customer_tax_identities', 'alias') && !Schema::hasColumn('customer_tax_identities', 'business_name')) {
                Schema::table('customer_tax_identities', function (Blueprint $table) {
                    $table->string('business_name')->nullable()->comment('Razon Social or Alias')->after('cuit');
                });
            }
        }

        // Only migrate data if table is empty
        $existingCount = DB::table('customer_tax_identities')->count();
        if ($existingCount === 0) {
            // Migrate existing CUIT data from people table to customer_tax_identities
            $customers = DB::table('customers')
                ->join('people', 'customers.person_id', '=', 'people.id')
                ->select('customers.id as customer_id', 'people.cuit', 'people.fiscal_condition_id', 'people.first_name', 'people.last_name')
                ->whereNull('customers.deleted_at')
                ->get();

            foreach ($customers as $customer) {
                if (!empty($customer->cuit)) {
                    DB::table('customer_tax_identities')->insert([
                        'customer_id' => $customer->customer_id,
                        'cuit' => $customer->cuit,
                        'business_name' => trim($customer->first_name . ' ' . $customer->last_name),
                        'fiscal_condition_id' => $customer->fiscal_condition_id,
                        'is_default' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_tax_identities');
    }
};
