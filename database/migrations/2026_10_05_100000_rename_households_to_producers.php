<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The producer's table and its foreign keys take the name the code has
 * used all along: "households" -> "producers", "household_id" ->
 * "producer_id", and the stored polymorphic alias "household" ->
 * "producer". Only names change; no row is touched beyond the alias.
 */
return new class extends Migration
{
    /** Every table with a household_id column. */
    private const TABLES = [
        'products', 'reviews', 'producer_images', 'producer_messages', 'producer_change_requests',
        'producer_follows', 'producer_subscriptions', 'producer_stats', 'weekly_picks', 'boosts',
        'conversation_blocks', 'campaign_participants', 'inquiry_outcomes',
    ];

    /** Columns holding a polymorphic alias, which may name a producer. */
    private const MORPH_COLUMNS = [
        'favorites' => 'favoritable_type',
        'reports' => 'reportable_type',
        'boosts' => 'boostable_type',
        'slug_redirects' => 'model_type',
    ];

    public function up(): void
    {
        Schema::rename('households', 'producers');

        foreach (self::TABLES as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->renameColumn('household_id', 'producer_id'));
        }

        $this->renameAlias('household', 'producer');
    }

    public function down(): void
    {
        $this->renameAlias('producer', 'household');

        foreach (self::TABLES as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->renameColumn('producer_id', 'household_id'));
        }

        Schema::rename('producers', 'households');
    }

    private function renameAlias(string $from, string $to): void
    {
        foreach (self::MORPH_COLUMNS as $table => $column) {
            DB::table($table)->where($column, $from)->update([$column => $to]);
        }
    }
};
