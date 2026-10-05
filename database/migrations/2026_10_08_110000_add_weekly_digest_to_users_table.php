<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The weekly e-mail about producers a person follows
 * (App\Console\Commands\SendWeeklyDigest): whether they want it, and when
 * the last one went out, so a second run in the same week sends nothing.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('notify_weekly_digest')->default(true)->after('notify_messages_by_email');
            $table->timestamp('digest_sent_at')->nullable()->after('notify_weekly_digest');
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['notify_weekly_digest', 'digest_sent_at']));
    }
};
