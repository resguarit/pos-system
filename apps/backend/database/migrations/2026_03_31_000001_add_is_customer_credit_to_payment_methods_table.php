<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->boolean('is_customer_credit')
                ->default(false)
                ->after('affects_cash');
        });

        // Best-effort backfill for existing databases (handles "Cuenta Corriente", "CUENTA CORRIENTE", etc.).
        DB::table('payment_methods')
            ->whereRaw('UPPER(name) LIKE ?', ['%CUENTA CORRIENTE%'])
            ->update(['is_customer_credit' => true]);
    }

    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropColumn('is_customer_credit');
        });
    }
};

