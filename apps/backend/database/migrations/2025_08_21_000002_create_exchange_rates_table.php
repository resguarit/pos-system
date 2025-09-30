<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateExchangeRatesTable extends Migration
{
    public function up()
    {
        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->id();
            $table->enum('from_currency', ['USD', 'ARS']);
            $table->enum('to_currency', ['USD', 'ARS']);
            $table->decimal('rate', 15, 4);
            $table->boolean('is_active')->default(true);
            $table->timestamp('effective_date');
            $table->timestamps();
            
            // Índices para optimización
            $table->index(['from_currency', 'to_currency', 'is_active']);
            $table->index('effective_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('exchange_rates');
    }
}
