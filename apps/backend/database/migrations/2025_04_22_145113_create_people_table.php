<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('people', function (Blueprint $table) {
            $table->id();
            $table->string('last_name');
            $table->string('first_name');
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('cuit', 11)->nullable();
            $table->foreignId('fiscal_condition_id')->nullable()->constrained('fiscal_conditions');
            $table->foreignId('person_type_id')->nullable()->constrained('person_types');
            $table->foreignId('document_type_id')->nullable()->constrained('document_types');
            $table->unsignedBigInteger('documento')->nullable();
            $table->decimal('credit_limit', 12, 2)->default(0);
            $table->string('person_type')->default('person'); // Campo para guardar el tipo de modelo (customer/user)
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('people');
    }
};
