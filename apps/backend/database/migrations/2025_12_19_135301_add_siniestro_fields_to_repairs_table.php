<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('repairs', function (Blueprint $table) {
            $table->boolean('is_siniestro')->default(false)->after('initial_notes');
            $table->foreignId('insurer_id')->nullable()->after('is_siniestro')->constrained('insurers')->nullOnDelete();
            $table->string('siniestro_number')->nullable()->after('insurer_id');
            $table->foreignId('insured_customer_id')->nullable()->after('siniestro_number')->constrained('customers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('repairs', function (Blueprint $table) {
            $table->dropForeign(['insurer_id']);
            $table->dropForeign(['insured_customer_id']);
            $table->dropColumn(['is_siniestro', 'insurer_id', 'siniestro_number', 'insured_customer_id']);
        });
    }
};
