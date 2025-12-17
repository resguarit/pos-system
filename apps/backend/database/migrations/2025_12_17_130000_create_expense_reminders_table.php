<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('expense_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expense_id')->constrained('expenses')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->date('next_due_date');
            $table->enum('status', ['pending', 'sent', 'dismissed'])->default('pending');
            $table->datetime('notified_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'next_due_date']);
            $table->unique(['expense_id', 'next_due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_reminders');
    }
};
