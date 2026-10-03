<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Producers no longer ask to cancel through the site, and refunds are no
 * longer tracked there: an administrator cancels, and any money owed back
 * is settled with the producer directly. The columns that carried both go,
 * with the notifications about them.
 */
return new class extends Migration
{
    private const TABLES = ['producer_subscriptions', 'boosts', 'campaign_participants'];

    private const COLUMNS = ['cancel_requested_at', 'refund_rsd', 'refund_account', 'refunded_at'];

    public function up(): void
    {
        foreach (self::TABLES as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->dropColumn(self::COLUMNS));
        }

        DB::table('notifications')
            ->where(fn ($query) => $query
                ->where('data', 'like', '%"type":"refund.%')
                ->orWhere('data', 'like', '%"type":"admin.cancel-requested"%')
                ->orWhere('data', 'like', '%"type":"admin.refund-account"%'))
            ->delete();
    }

    public function down(): void
    {
        foreach (self::TABLES as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->timestamp('cancel_requested_at')->nullable();
                $table->unsignedInteger('refund_rsd')->nullable();
                $table->string('refund_account', 40)->nullable();
                $table->timestamp('refunded_at')->nullable();
            });
        }
    }
};
