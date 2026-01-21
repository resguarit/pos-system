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
        Schema::table('current_accounts', function (Blueprint $table) {
            // Make customer_id nullable to allow accounts that belong only to suppliers
            $table->unsignedBigInteger('customer_id')->nullable()->change();

            // Add supplier_id
            $table->unsignedBigInteger('supplier_id')->nullable()->after('customer_id');
            $table->foreign('supplier_id')->references('id')->on('suppliers');
            $table->unique('supplier_id');
        });

        Schema::table('current_account_movements', function (Blueprint $table) {
            if (!Schema::hasColumn('current_account_movements', 'purchase_order_id')) {
                $table->unsignedBigInteger('purchase_order_id')->nullable()->after('sale_id');
                $table->foreign('purchase_order_id')->references('id')->on('purchase_orders');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('current_account_movements', function (Blueprint $table) {
            if (Schema::hasColumn('current_account_movements', 'purchase_order_id')) {
                $table->dropForeign(['purchase_order_id']);
                $table->dropColumn('purchase_order_id');
            }
        });

        Schema::table('current_accounts', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropIndex(['supplier_id']);
            $table->dropColumn('supplier_id');

            // Revert customer_id to not nullable (careful if we have nulls)
            // Ideally we shouldn't revert this strictly if we created supplier accounts, 
            // but for symmetry:
            // $table->unsignedBigInteger('customer_id')->nullable(false)->change(); 
            // Commented out to avoid errors on rollback if data exists
        });
    }
};
