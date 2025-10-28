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
        
        // Remove tracking_number if it exists (not needed)
        if (Schema::hasColumn('shipments', 'tracking_number')) {
            Schema::table('shipments', function (Blueprint $table) {
                $table->dropColumn('tracking_number');
            });
        }
        
        // Remove any other columns that shouldn't be there
        $columnsToRemove = ['status', 'actual_delivery_date'];
        
        foreach ($columnsToRemove as $column) {
            if (Schema::hasColumn('shipments', $column)) {
                Schema::table('shipments', function (Blueprint $table) use ($column) {
                    $table->dropColumn($column);
                });
            }
        }
        
        // Ensure all required columns exist and are nullable where needed
        Schema::table('shipments', function (Blueprint $table) {
            if (Schema::hasColumn('shipments', 'metadata')) {
                $table->json('metadata')->nullable()->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Don't recreate removed columns
    }
};
