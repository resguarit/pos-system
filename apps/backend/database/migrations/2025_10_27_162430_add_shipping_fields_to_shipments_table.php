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
        // Solo ejecutar si la tabla existe
        if (!Schema::hasTable('shipments')) {
            return;
        }
        
        Schema::table('shipments', function (Blueprint $table) {
            if (!Schema::hasColumn('shipments', 'shipping_address')) {
                $table->string('shipping_address')->nullable()->after('metadata');
            }
            if (!Schema::hasColumn('shipments', 'shipping_city')) {
                $table->string('shipping_city')->nullable()->after('shipping_address');
            }
            if (!Schema::hasColumn('shipments', 'shipping_state')) {
                $table->string('shipping_state')->nullable()->after('shipping_city');
            }
            if (!Schema::hasColumn('shipments', 'shipping_postal_code')) {
                $table->string('shipping_postal_code')->nullable()->after('shipping_state');
            }
            if (!Schema::hasColumn('shipments', 'shipping_country')) {
                $table->string('shipping_country')->nullable()->after('shipping_postal_code');
            }
            if (!Schema::hasColumn('shipments', 'priority')) {
                $table->string('priority')->default('normal')->after('shipping_country');
            }
            if (!Schema::hasColumn('shipments', 'estimated_delivery_date')) {
                $table->date('estimated_delivery_date')->nullable()->after('priority');
            }
            if (!Schema::hasColumn('shipments', 'notes')) {
                $table->text('notes')->nullable()->after('estimated_delivery_date');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn([
                'shipping_address',
                'shipping_city',
                'shipping_state',
                'shipping_postal_code',
                'shipping_country',
                'priority',
                'estimated_delivery_date',
                'notes',
            ]);
        });
    }
};
