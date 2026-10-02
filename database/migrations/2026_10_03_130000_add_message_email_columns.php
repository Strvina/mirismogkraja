<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * E-mail about unread messages (App\Console\Commands\EmailUnreadMessages):
 * which messages a mail has already covered, whether a person wants such
 * mail at all, and the language to write it in.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('producer_messages', function (Blueprint $table) {
            $table->timestamp('emailed_at')->nullable()->after('read_at');
            // The command's question: unread, not yet mailed, from when.
            $table->index(['read_at', 'emailed_at', 'created_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('notify_messages_by_email')->default(true)->after('blocked_at');
            $table->string('locale', 5)->nullable()->after('notify_messages_by_email');
        });
    }

    public function down(): void
    {
        Schema::table('producer_messages', function (Blueprint $table) {
            $table->dropIndex(['read_at', 'emailed_at', 'created_at']);
            $table->dropColumn('emailed_at');
        });

        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['notify_messages_by_email', 'locale']));
    }
};
