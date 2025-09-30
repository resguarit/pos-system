<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Alinear esquema de cash_movements con el modelo/controlador
        Schema::table('cash_movements', function (Blueprint $table) {
            if (!Schema::hasColumn('cash_movements', 'user_id')) {
                // Crear como nullable para evitar conflictos con datos existentes
                $table->unsignedBigInteger('user_id')->nullable()->after('description');
            }
            if (!Schema::hasColumn('cash_movements', 'reference_type')) {
                $table->string('reference_type')->nullable()->after('user_id');
            }
            if (!Schema::hasColumn('cash_movements', 'reference_id')) {
                $table->unsignedBigInteger('reference_id')->nullable()->after('reference_type');
            }

            if (Schema::hasColumn('cash_movements', 'reference')) {
                $table->dropColumn('reference');
            }
            if (Schema::hasColumn('cash_movements', 'sale_id')) {
                // Eliminar FK si existe y luego la columna
                try { $table->dropForeign(['sale_id']); } catch (\Throwable $e) {}
                $table->dropColumn('sale_id');
            }
        });

        // Asegurar que user_id permita NULL (por si la columna ya existía NOT NULL)
        if (Schema::hasColumn('cash_movements', 'user_id')) {
            try {
                DB::statement('ALTER TABLE cash_movements MODIFY user_id BIGINT UNSIGNED NULL');
            } catch (\Throwable $e) {
                // Ignorar si no es necesario o motor no lo permite
            }
        }

        // Normalizar datos existentes: evitar valores 0 inválidos
        $defaultUserId = DB::table('users')->min('id');
        if ($defaultUserId) {
            DB::table('cash_movements')
                ->whereNull('user_id')
                ->orWhere('user_id', 0)
                ->update(['user_id' => $defaultUserId]);
        } else {
            // Si no hay usuarios, dejar NULL para no romper la FK
            DB::table('cash_movements')
                ->where('user_id', 0)
                ->update(['user_id' => null]);
        }

        // Agregar la FK (columna nullable, por lo que valores NULL son válidos)
        Schema::table('cash_movements', function (Blueprint $table) {
            // Evitar duplicar la FK si ya existe
            try {
                $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            } catch (\Throwable $e) {
                // Puede fallar si ya existe; ignorar
            }
        });
    }

    public function down(): void
    {
        Schema::table('cash_movements', function (Blueprint $table) {
            // Quitar FK si existe
            try { $table->dropForeign(['user_id']); } catch (\Throwable $e) {}

            if (Schema::hasColumn('cash_movements', 'reference_id')) {
                $table->dropColumn('reference_id');
            }
            if (Schema::hasColumn('cash_movements', 'reference_type')) {
                $table->dropColumn('reference_type');
            }
            if (Schema::hasColumn('cash_movements', 'user_id')) {
                $table->dropColumn('user_id');
            }
            // Opcional: restaurar columnas legacy
            if (!Schema::hasColumn('cash_movements', 'reference')) {
                $table->string('reference', 100)->nullable();
            }
            if (!Schema::hasColumn('cash_movements', 'sale_id')) {
                $table->unsignedBigInteger('sale_id')->nullable();
            }
        });
    }
};
