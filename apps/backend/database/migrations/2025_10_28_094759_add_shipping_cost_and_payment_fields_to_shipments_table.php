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
        Schema::table('shipments', function (Blueprint $table) {
            if (!Schema::hasColumn('shipments', 'shipping_cost')) {
                $table->decimal('shipping_cost', 10, 2)->default(0)->after('priority');
            }
            if (!Schema::hasColumn('shipments', 'is_paid')) {
                $table->boolean('is_paid')->default(false)->after('shipping_cost');
            }
            if (!Schema::hasColumn('shipments', 'payment_date')) {
                $table->timestamp('payment_date')->nullable()->after('is_paid');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn(['shipping_cost', 'is_paid', 'payment_date']);
        });
    }
};
