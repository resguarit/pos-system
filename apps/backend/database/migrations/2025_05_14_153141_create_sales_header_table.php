<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_header', function (Blueprint $table) {
            $table->id();
            $table->dateTime('date');
            $table->foreignId('receipt_type_id')->constrained('receipt_type');
            $table->foreignId('branch_id')->constrained('branches');
            $table->string('receipt_number');
            $table->foreignId('customer_id')->nullable()->constrained('customers');
            $table->foreignId('sale_fiscal_condition_id')->nullable()->constrained('fiscal_conditions');
            $table->foreignId('sale_document_type_id')->nullable()->constrained('document_types');
            $table->string('sale_document_number')->nullable();

            // Montos Totales del Comprobante
            $table->decimal('subtotal', 15, 3); 
            $table->decimal('total_iva_amount', 15, 3); 
            $table->decimal('iibb', 15, 3)->nullable();
            $table->decimal('internal_tax', 15, 3)->nullable();
            $table->decimal('discount_amount', 15, 3)->nullable();
            $table->decimal('total', 15, 3); 

            $table->string('cae')->nullable();
            $table->date('cae_expiration_date')->nullable();
            $table->date('service_from_date')->nullable();
            $table->date('service_to_date')->nullable();
            $table->date('service_due_date')->nullable();
            $table->foreignId('user_id')->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_header');
    }
};