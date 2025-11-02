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
        Schema::table('people', function (Blueprint $table) {
            if (!Schema::hasColumn('people', 'city')) {
                $table->string('city')->nullable()->after('address');
            }
            if (!Schema::hasColumn('people', 'state')) {
                $table->string('state')->nullable()->after('city');
            }
            if (!Schema::hasColumn('people', 'postal_code')) {
                $table->string('postal_code')->nullable()->after('state');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('people', function (Blueprint $table) {
            $table->dropColumn(['city', 'state', 'postal_code']);
        });
    }
};
