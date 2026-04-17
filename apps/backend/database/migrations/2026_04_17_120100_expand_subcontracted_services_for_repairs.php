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
        Schema::table('subcontracted_services', function (Blueprint $table) {
            if (!Schema::hasColumn('subcontracted_services', 'repair_id')) {
                $table->foreignId('repair_id')->nullable()->constrained('repairs')->nullOnDelete();
            }

            if (!Schema::hasColumn('subcontracted_services', 'supplier_id')) {
                $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            }

            if (!Schema::hasColumn('subcontracted_services', 'current_account_id')) {
                $table->foreignId('current_account_id')->nullable()->constrained('current_accounts')->nullOnDelete();
            }

            if (!Schema::hasColumn('subcontracted_services', 'charge_movement_id')) {
                $table->foreignId('charge_movement_id')->nullable()->constrained('current_account_movements')->nullOnDelete();
            }

            if (!Schema::hasColumn('subcontracted_services', 'agreed_cost')) {
                $table->decimal('agreed_cost', 12, 2)->default(0);
            }

            if (!Schema::hasColumn('subcontracted_services', 'paid_amount')) {
                $table->decimal('paid_amount', 12, 2)->default(0);
            }

            if (!Schema::hasColumn('subcontracted_services', 'payment_status')) {
                $table->enum('payment_status', ['pending', 'partial', 'paid'])->default('pending');
            }

            if (!Schema::hasColumn('subcontracted_services', 'description')) {
                $table->string('description', 500)->nullable();
            }

            if (!Schema::hasColumn('subcontracted_services', 'notes')) {
                $table->text('notes')->nullable();
            }

            if (!Schema::hasColumn('subcontracted_services', 'fully_paid_at')) {
                $table->timestamp('fully_paid_at')->nullable();
            }

            if (!Schema::hasColumn('subcontracted_services', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('subcontracted_services', function (Blueprint $table) {
            if (Schema::hasColumn('subcontracted_services', 'repair_id')) {
                $table->index(['repair_id', 'payment_status'], 'subcontracted_services_repair_payment_idx');
            }

            if (Schema::hasColumn('subcontracted_services', 'supplier_id')) {
                $table->index(['supplier_id', 'payment_status'], 'subcontracted_services_supplier_payment_idx');
            }

            if (Schema::hasColumn('subcontracted_services', 'repair_id') && Schema::hasColumn('subcontracted_services', 'deleted_at')) {
                $table->unique(['repair_id', 'deleted_at'], 'subcontracted_services_unique_active_repair');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subcontracted_services', function (Blueprint $table) {
            if (Schema::hasColumn('subcontracted_services', 'repair_id')) {
                $table->dropUnique('subcontracted_services_unique_active_repair');
                $table->dropIndex('subcontracted_services_repair_payment_idx');
            }

            if (Schema::hasColumn('subcontracted_services', 'supplier_id')) {
                $table->dropIndex('subcontracted_services_supplier_payment_idx');
            }
        });

        Schema::table('subcontracted_services', function (Blueprint $table) {
            if (Schema::hasColumn('subcontracted_services', 'fully_paid_at')) {
                $table->dropColumn('fully_paid_at');
            }

            if (Schema::hasColumn('subcontracted_services', 'notes')) {
                $table->dropColumn('notes');
            }

            if (Schema::hasColumn('subcontracted_services', 'description')) {
                $table->dropColumn('description');
            }

            if (Schema::hasColumn('subcontracted_services', 'payment_status')) {
                $table->dropColumn('payment_status');
            }

            if (Schema::hasColumn('subcontracted_services', 'paid_amount')) {
                $table->dropColumn('paid_amount');
            }

            if (Schema::hasColumn('subcontracted_services', 'agreed_cost')) {
                $table->dropColumn('agreed_cost');
            }

            if (Schema::hasColumn('subcontracted_services', 'charge_movement_id')) {
                $table->dropConstrainedForeignId('charge_movement_id');
            }

            if (Schema::hasColumn('subcontracted_services', 'current_account_id')) {
                $table->dropConstrainedForeignId('current_account_id');
            }

            if (Schema::hasColumn('subcontracted_services', 'supplier_id')) {
                $table->dropConstrainedForeignId('supplier_id');
            }

            if (Schema::hasColumn('subcontracted_services', 'repair_id')) {
                $table->dropConstrainedForeignId('repair_id');
            }

            if (Schema::hasColumn('subcontracted_services', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};
