<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migración idempotente para clientes que tenían esta migración con otro nombre/fecha.
 * Si la columna ya existe (p. ej. por 2026_01_22_115554), no hace nada.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('client_services', 'service_type_id')) {
            Schema::table('client_services', function (Blueprint $table) {
                $table->foreignId('service_type_id')->nullable()->after('customer_id')->constrained('service_types')->onDelete('set null');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('client_services', 'service_type_id')) {
            Schema::table('client_services', function (Blueprint $table) {
                $table->dropForeign(['service_type_id']);
                $table->dropColumn('service_type_id');
            });
        }
    }
};
