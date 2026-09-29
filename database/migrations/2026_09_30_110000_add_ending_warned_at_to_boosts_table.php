<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * When a producer was told their boost ends tomorrow, so the daily command
 * says it once - the same guard memberships have in expiry_warned_at.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('boosts', fn (Blueprint $table) => $table->timestamp('ending_warned_at')->nullable()->after('ends_at'));
    }

    public function down(): void
    {
        Schema::table('boosts', fn (Blueprint $table) => $table->dropColumn('ending_warned_at'));
    }
};
