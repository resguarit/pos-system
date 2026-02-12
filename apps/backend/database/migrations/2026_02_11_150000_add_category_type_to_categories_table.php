<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            if (!Schema::hasColumn('categories', 'category_type')) {
                $table->string('category_type', 50)->default('product')->after('parent_id');
                $table->index('category_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            if (Schema::hasColumn('categories', 'category_type')) {
                $table->dropIndex(['category_type']);
                $table->dropColumn('category_type');
            }
        });
    }
};
