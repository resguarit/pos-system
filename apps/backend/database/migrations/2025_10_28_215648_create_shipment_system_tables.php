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
        // Create shipment_stages table
        if (!Schema::hasTable('shipment_stages')) {
            Schema::create('shipment_stages', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->id();
                $table->string('name');
                $table->text('description')->nullable();
                $table->integer('order')->default(0);
                $table->json('config')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // Create shipments table
        if (!Schema::hasTable('shipments')) {
            Schema::create('shipments', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->id();
                $table->string('reference')->nullable()->unique();
                $table->json('metadata')->nullable();
                $table->foreignId('current_stage_id')->nullable()->constrained('shipment_stages');
                $table->integer('version')->default(1);
                $table->foreignId('created_by')->nullable()->constrained('users');
                $table->foreignId('branch_id')->nullable()->constrained('branches');
                $table->integer('tenant_id')->nullable();
                $table->string('shipping_address')->nullable();
                $table->string('shipping_city')->nullable();
                $table->string('shipping_state')->nullable();
                $table->string('shipping_postal_code')->nullable();
                $table->string('shipping_country')->nullable();
                $table->string('priority')->default('normal');
                $table->date('estimated_delivery_date')->nullable();
                $table->text('notes')->nullable();
                $table->decimal('shipping_cost', 10, 2)->default(0);
                $table->boolean('is_paid')->default(false);
                $table->timestamp('payment_date')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // Create shipment_events table
        if (!Schema::hasTable('shipment_events')) {
            Schema::create('shipment_events', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->id();
                $table->foreignId('shipment_id')->constrained('shipments')->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained('users');
                $table->foreignId('from_stage_id')->nullable()->constrained('shipment_stages');
                $table->foreignId('to_stage_id')->nullable()->constrained('shipment_stages');
                $table->json('metadata')->nullable();
                $table->string('ip')->nullable();
                $table->string('user_agent')->nullable();
                $table->timestamps();
            });
        }

        // Create shipment_sale pivot table
        if (!Schema::hasTable('shipment_sale')) {
            Schema::create('shipment_sale', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->id();
                $table->foreignId('shipment_id')->constrained('shipments')->onDelete('cascade');
                // Usar definición explícita para evitar problemas de FK en algunos entornos
                $table->unsignedBigInteger('sale_id');
                $table->foreign('sale_id')->references('id')->on('sales_header')->onDelete('cascade');
                $table->timestamps();

                $table->unique(['shipment_id', 'sale_id']);
            });
        }

        // Create shipment_stage_role pivot table
        if (!Schema::hasTable('shipment_stage_role')) {
            Schema::create('shipment_stage_role', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->id();
                $table->foreignId('stage_id')->constrained('shipment_stages')->onDelete('cascade');
                $table->foreignId('role_id')->constrained('roles')->onDelete('cascade');
                $table->timestamps();
                
                $table->unique(['stage_id', 'role_id']);
            });
        }

        // Create shipment_role_attribute_visibility table (if referenced)
        if (!Schema::hasTable('shipment_role_attribute_visibility')) {
            Schema::create('shipment_role_attribute_visibility', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->id();
                $table->foreignId('stage_id')->constrained('shipment_stages')->onDelete('cascade');
                $table->foreignId('role_id')->nullable()->constrained('roles')->onDelete('cascade');
                $table->string('attribute')->nullable();
                $table->boolean('visible')->default(true);
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipment_role_attribute_visibility');
        Schema::dropIfExists('shipment_stage_role');
        Schema::dropIfExists('shipment_sale');
        Schema::dropIfExists('shipment_events');
        Schema::dropIfExists('shipments');
        Schema::dropIfExists('shipment_stages');
    }
};
