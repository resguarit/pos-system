<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * Agrega campo para restringir sesiones a un solo dispositivo por rol.
     */
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->boolean('single_session_only')->default(false)
                ->after('access_schedule')
                ->comment('Si es true, el usuario solo puede tener una sesión activa a la vez');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn('single_session_only');
        });
    }
};
