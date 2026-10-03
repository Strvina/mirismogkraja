<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * "blocked": a product an administrator took down, which - unlike the
 * owner's own "archived" - the owner cannot put back up.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->enum('status', ['draft', 'active', 'archived', 'blocked'])->default('draft')->change();
        });
    }

    public function down(): void
    {
        DB::table('products')->where('status', 'blocked')->update(['status' => 'archived']);

        Schema::table('products', function (Blueprint $table) {
            $table->enum('status', ['draft', 'active', 'out_of_stock', 'archived'])->default('draft')->change();
        });
    }
};
