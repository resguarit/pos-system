<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('repairs', function (Blueprint $table) {
            if (!Schema::hasColumn('repairs', 'sale_id')) {
                $table->foreignId('sale_id')->nullable()->after('technician_id')->constrained('sales_header')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('repairs', function (Blueprint $table) {
            if (Schema::hasColumn('repairs', 'sale_id')) {
                $table->dropConstrainedForeignId('sale_id');
            }
        });
    }
};
