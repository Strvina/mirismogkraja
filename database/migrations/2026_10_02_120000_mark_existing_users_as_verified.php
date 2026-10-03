<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * E-mail verification became required with this release. The accounts that
 * already exist signed up when it wasn't asked for, so they are taken as
 * verified rather than locked out of their own conversations and producers.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->whereNull('email_verified_at')->update(['email_verified_at' => now()]);
    }

    /** Which of them were unverified before is not recorded, so nothing to undo. */
    public function down(): void {}
};
