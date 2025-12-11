<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, drop and recreate the employee_branch table with proper structure
        Schema::dropIfExists('employee_branch');

        Schema::create('employee_branch', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            // Prevent duplicate employee-branch assignments
            $table->unique(['employee_id', 'branch_id']);
        });

        // Migrate existing branch_id data from employees table to pivot table
        $employees = DB::table('employees')->whereNotNull('branch_id')->get();
        foreach ($employees as $employee) {
            DB::table('employee_branch')->insert([
                'employee_id' => $employee->id,
                'branch_id' => $employee->branch_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_branch');

        // Recreate simple version
        Schema::create('employee_branch', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
        });
    }
};
