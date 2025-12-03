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
        Schema::create('afip_certificates', function (Blueprint $table) {
            $table->id();
            $table->string('cuit', 11)->unique()->comment('CUIT sin guiones');
            $table->string('razon_social')->comment('Razón social del contribuyente');
            $table->enum('environment', ['production', 'testing'])->default('testing');
            $table->string('alias')->nullable()->comment('Nombre amigable para identificar');
            $table->date('valid_from')->nullable()->comment('Fecha desde del certificado');
            $table->date('valid_to')->nullable()->comment('Fecha hasta del certificado');
            $table->boolean('active')->default(true);
            $table->boolean('has_certificate')->default(false)->comment('Si tiene archivos de certificado');
            $table->boolean('has_private_key')->default(false)->comment('Si tiene archivo de clave privada');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('afip_certificates');
    }
};
