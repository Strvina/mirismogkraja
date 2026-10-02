<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * When a product first went public. Followers hear about that moment only:
 * taking a listing down and putting it back up is not news, and must not
 * become a way to send every follower a notification on demand.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', fn (Blueprint $table) => $table->timestamp('published_at')->nullable()->after('status'));

        // Everything public or once public has had its announcement.
        DB::table('products')->whereIn('status', ['active', 'archived', 'blocked'])->update(['published_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn('published_at'));
    }
};
