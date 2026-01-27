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
        // Modify ENUM to include all billing cycle options
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE client_services MODIFY COLUMN billing_cycle ENUM('monthly', 'quarterly', 'annual', 'one_time') DEFAULT 'monthly'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE client_services MODIFY COLUMN billing_cycle ENUM('monthly', 'annual', 'one_time') DEFAULT 'monthly'");
    }
};
