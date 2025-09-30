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
        Schema::table('users', function (Blueprint $table) {
            // Eliminar columnas que ya están en la tabla de personas
            $table->dropColumn('name');
            
            // Añadir campos específicos de usuario
            $table->foreignId('person_id')->after('id')->nullable()->constrained('people')->onDelete('cascade');
            $table->string('username')->after('email')->unique();
            $table->boolean('active')->after('password')->default(true);
            $table->foreignId('role_id')->after('active')->nullable()->constrained('roles');
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name');
            $table->dropForeign(['person_id']);
            $table->dropForeign(['role_id']);
            $table->dropColumn(['person_id', 'username', 'active', 'role_id']);
            $table->dropSoftDeletes();
        });
    }
};
