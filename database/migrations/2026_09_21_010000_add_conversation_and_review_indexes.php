<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->index(['household_id', 'created_at']);
        });
    }

    public function down(): void
    {
        // On MySQL this index also backs the household foreign key (see
        // add_indexes_for_public_listings), so a plain one goes back first.
        Schema::table('reviews', fn (Blueprint $table) => $table->index('household_id'));
        Schema::table('reviews', fn (Blueprint $table) => $table->dropIndex(['household_id', 'created_at']));
    }
};
