<?php

use App\Models\User;
use App\Support\Media;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Accounts deleted before deleting one also cleared the person's details:
 * their name, phone, address and photo were still stored. Cleared now, the
 * same way a deletion does it from here on.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->whereNotNull('deleted_at')->orderBy('id')->chunkById(500, function ($users) {
            Media::delete($users->pluck('avatar_path')->filter()->all());

            DB::table('users')->whereIn('id', $users->pluck('id'))->update(User::ANONYMISED);
        });
    }

    /** The cleared details are gone for good. */
    public function down(): void {}
};
