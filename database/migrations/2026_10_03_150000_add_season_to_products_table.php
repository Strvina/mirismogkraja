<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * When a product is in season, as months (1-12). Both empty: all year.
 * A range may wrap the new year - November to February is 11 to 2.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedTinyInteger('season_from')->nullable()->after('stock_quantity');
            $table->unsignedTinyInteger('season_to')->nullable()->after('season_from');
        });
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn(['season_from', 'season_to']));
    }
};
