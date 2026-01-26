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
        Schema::table('client_services', function (Blueprint $table) {
            $table->enum('next_billing_cycle', ['monthly', 'quarterly', 'annual', 'one_time'])->nullable()->after('billing_cycle');
            $table->decimal('next_amount', 15, 2)->nullable()->after('amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('client_services', function (Blueprint $table) {
            $table->dropColumn(['next_billing_cycle', 'next_amount']);
        });
    }
};
