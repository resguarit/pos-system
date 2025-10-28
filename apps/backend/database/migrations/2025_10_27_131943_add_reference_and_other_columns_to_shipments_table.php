<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, update existing rows to have references
        DB::table('shipments')->whereNull('reference')
            ->orWhere('reference', '')
            ->update([
                'reference' => DB::raw("CONCAT('SH-', UPPER(SUBSTRING(MD5(RAND()), 1, 8)))")
            ]);
        
        // Then modify the column to be NOT NULL and unique
        Schema::table('shipments', function (Blueprint $table) {
            if (Schema::hasColumn('shipments', 'reference')) {
                $table->string('reference')->nullable(false)->unique()->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse - this is a one-time fix
    }
};
