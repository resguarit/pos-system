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
        if (!Schema::hasTable('shipments')) {
            return;
        }

        Schema::table('shipments', function (Blueprint $table) {
            if (!Schema::hasColumn('shipments', 'estimated_delivery_window_start')) {
                $table->dateTime('estimated_delivery_window_start')->nullable()->after('estimated_delivery_date');
            }

            if (!Schema::hasColumn('shipments', 'estimated_delivery_window_end')) {
                $table->dateTime('estimated_delivery_window_end')->nullable()->after('estimated_delivery_window_start');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('shipments')) {
            return;
        }

        Schema::table('shipments', function (Blueprint $table) {
            if (Schema::hasColumn('shipments', 'estimated_delivery_window_start')) {
                $table->dropColumn('estimated_delivery_window_start');
            }

            if (Schema::hasColumn('shipments', 'estimated_delivery_window_end')) {
                $table->dropColumn('estimated_delivery_window_end');
            }
        });
    }
};
