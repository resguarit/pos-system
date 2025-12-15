<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('repairs', function (Blueprint $table) {
            $table->decimal('sale_price', 12, 2)->nullable()->after('cost');
            $table->text('diagnosis')->nullable()->after('issue_description');
        });
    }

    public function down(): void
    {
        Schema::table('repairs', function (Blueprint $table) {
            $table->dropColumn(['sale_price', 'diagnosis']);
        });
    }
};
