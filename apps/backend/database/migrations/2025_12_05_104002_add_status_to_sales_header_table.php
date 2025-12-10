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
        Schema::table('sales_header', function (Blueprint $table) {
            // Estado de la venta: pending (pendiente), approved (aprobada), rejected (rechazada)
            if (!Schema::hasColumn('sales_header', 'status')) {
                $table->enum('status', ['pending', 'approved', 'rejected'])->default('approved')->after('user_id');
            }

            // Usuario que aprobó o rechazó la venta
            if (!Schema::hasColumn('sales_header', 'approved_by')) {
                $table->unsignedBigInteger('approved_by')->nullable()->after('status');
                $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
            }

            // Fecha y hora de aprobación o rechazo
            if (!Schema::hasColumn('sales_header', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('approved_by');
            }

            // Razón del rechazo (opcional)
            if (!Schema::hasColumn('sales_header', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable()->after('approved_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_header', function (Blueprint $table) {
            // Drop foreign key if it exists
            if (Schema::hasColumn('sales_header', 'approved_by')) {
                $table->dropForeign(['approved_by']);
            }

            // Drop columns if they exist
            $columnsToDrop = [];
            if (Schema::hasColumn('sales_header', 'status')) {
                $columnsToDrop[] = 'status';
            }
            if (Schema::hasColumn('sales_header', 'approved_by')) {
                $columnsToDrop[] = 'approved_by';
            }
            if (Schema::hasColumn('sales_header', 'approved_at')) {
                $columnsToDrop[] = 'approved_at';
            }
            if (Schema::hasColumn('sales_header', 'rejection_reason')) {
                $columnsToDrop[] = 'rejection_reason';
            }

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
