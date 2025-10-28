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
        if (!Schema::hasTable('shipment_stages')) {
            return; // La tabla no existe, saltar esta migración
        }
        
        Schema::table('shipment_stages', function (Blueprint $table) {
            // Add order if it doesn't exist
            if (!Schema::hasColumn('shipment_stages', 'order')) {
                $table->integer('order')->default(0)->after('description');
            }
            
            // Add active if it doesn't exist
            if (!Schema::hasColumn('shipment_stages', 'active')) {
                $table->boolean('active')->default(true)->after('order');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipment_stages', function (Blueprint $table) {
            $table->dropColumn('order');
            $table->dropColumn('active');
        });
    }
};
