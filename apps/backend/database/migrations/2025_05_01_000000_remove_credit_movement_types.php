<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Soft delete or remove the movement types related to "Credito a favor"
        DB::table('movement_types')
            ->whereIn('name', ['Uso de crédito a favor', 'Ajuste a favor'])
            ->update(['active' => false]);

        // Optionally, we could delete them if we are sure no historical data depends on them heavily
        // For now, disabling them is safer.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('movement_types')
            ->whereIn('name', ['Uso de crédito a favor', 'Ajuste a favor'])
            ->update(['active' => true]);
    }
};
