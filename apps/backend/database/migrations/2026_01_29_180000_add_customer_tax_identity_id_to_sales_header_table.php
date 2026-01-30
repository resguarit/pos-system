<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_header', function (Blueprint $table) {
            $table->foreignId('customer_tax_identity_id')
                ->nullable()
                ->after('customer_id')
                ->constrained('customer_tax_identities')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sales_header', function (Blueprint $table) {
            $table->dropForeign(['customer_tax_identity_id']);
        });
    }
};
