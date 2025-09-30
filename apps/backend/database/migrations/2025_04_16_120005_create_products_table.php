<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateProductsTable extends Migration
{
    public function up()
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('description');
            $table->integer('code');
            $table->foreignId('measure_id')->constrained('measures')->onDelete('cascade'); // Cambiado a foreignId para referencia
            $table->decimal('unit_price', 8, 2); // Ajustado el tamaño para mayor precisión
            $table->decimal('markup', 8, 2);
            $table->foreignId('category_id')->constrained('categories')->onDelete('cascade'); // Cambiado a foreignId para referencia
            $table->foreignId('iva_id')->constrained('ivas')->onDelete('cascade'); // Cambiado a foreignId para referencia
            $table->string('image_id')->nullable();
            $table->foreignId('supplier_id')->constrained('suppliers')->onDelete('cascade'); // Cambiado a foreignId para referencia
            $table->boolean('status');
            $table->boolean('web');
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes(); // Añadir esta línea para habilitar el soft delete
        });
    }

    public function down()
    {
        Schema::dropIfExists('products');
    }
}