<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_header', function (Blueprint $table) {
            // Agregar campo de estado de la venta
            $table->enum('status', ['active', 'annulled'])->default('active')->after('user_id');
            
            // Campos de anulación
            $table->timestamp('annulled_at')->nullable()->after('status');
            $table->foreignId('annulled_by')->nullable()->constrained('users')->after('annulled_at');
            $table->text('annulment_reason')->nullable()->after('annulled_by');
            
            // Índices para optimizar consultas
            $table->index(['status', 'date']);
            $table->index(['annulled_by', 'annulled_at']);
        });
    }

    public function down(): void
    {
        Schema::table('sales_header', function (Blueprint $table) {
            $table->dropIndex(['status', 'date']);
            $table->dropIndex(['annulled_by', 'annulled_at']);
            
            $table->dropForeign(['annulled_by']);
            $table->dropColumn([
                'status',
                'annulled_at',
                'annulled_by',
                'annulment_reason'
            ]);
        });
    }
};
