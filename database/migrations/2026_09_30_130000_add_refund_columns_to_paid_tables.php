<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Money going back when something paid for is stopped early: how much the
 * admin decided to return, where the producer wants it, and when it was
 * sent. The transfer itself happens in the bank, like the payment did.
 */
return new class extends Migration
{
    private const TABLES = ['producer_subscriptions', 'boosts', 'campaign_participants'];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->unsignedInteger('refund_rsd')->nullable()->after('cancel_requested_at');
                $blueprint->string('refund_account', 40)->nullable()->after('refund_rsd');
                $blueprint->timestamp('refunded_at')->nullable()->after('refund_account');
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropColumn(['refund_rsd', 'refund_account', 'refunded_at']));
        }
    }
};
