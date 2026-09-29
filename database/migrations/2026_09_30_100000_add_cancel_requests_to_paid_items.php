<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A producer asking for something they paid for to be stopped. The admin
 * decides - a refund, if any, is agreed off the site - so this only records
 * that the request was made and when.
 */
return new class extends Migration
{
    private const TABLES = ['producer_subscriptions', 'boosts', 'campaign_participants'];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->timestamp('cancel_requested_at')->nullable()->after('status'));
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropColumn('cancel_requested_at'));
        }
    }
};
