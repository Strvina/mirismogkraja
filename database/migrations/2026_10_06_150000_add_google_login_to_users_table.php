<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Signing in with Google.
 *
 * google_id is Google's own, permanent id for the account ("sub") - the
 * e-mail address can change, this cannot. An account opened with Google has
 * no password until its owner sets one, so the column may be empty.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('google_id')->nullable()->unique();
            $table->string('password')->nullable()->change();
        });
    }

    public function down(): void
    {
        // The column is about to forbid empty passwords again; these
        // accounts get one nobody knows, and "forgot password" still works.
        DB::table('users')->whereNull('password')->orderBy('id')->each(function (object $user) {
            DB::table('users')->where('id', $user->id)->update(['password' => bcrypt(Str::random(64))]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['google_id']);
            $table->dropColumn('google_id');
            $table->string('password')->nullable(false)->change();
        });
    }
};
