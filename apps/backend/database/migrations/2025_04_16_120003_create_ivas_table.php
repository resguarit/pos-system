<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Eloquent\SoftDeletes;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ivas', function (Blueprint $table) {
            $table->id();
            $table->decimal('rate', 5, 2);
            $table->timestamps();
            $table->softDeletes();
            $table->unique('rate'); // Agregar restricción de unicidad para evitar tasas duplicadas
        });
    }

    public function down(): void
    {
        Schema::table('ivas', function (Blueprint $table) {
            $table->dropColumn('name');
        });
        Schema::dropIfExists('ivas');
    }
};