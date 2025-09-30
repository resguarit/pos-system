<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('repairs', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->foreignId('customer_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('technician_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('device');
            $table->string('serial_number')->nullable();
            $table->text('issue_description');
            $table->enum('priority', ['Alta','Media','Baja'])->default('Media');
            $table->enum('status', ['Recibido','En diagnóstico','En reparación','Esperando repuestos','Terminado','Entregado'])->default('Recibido');
            $table->date('intake_date');
            $table->date('estimated_date')->nullable();
            $table->decimal('cost', 12, 2)->nullable();
            $table->text('initial_notes')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('repairs');
    }
};
