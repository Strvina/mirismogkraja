<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * The other half of the morph-alias change.
     *
     * Roles were moved in an earlier migration, but notifications are stored
     * polymorphically too - every one written before 'user' entered the morph
     * map still names the class, so the owner's own inbox could not find
     * them. This finishes the job for that table.
     */
    public function up(): void
    {
        DB::table('notifications')->where('notifiable_type', 'App\Models\User')->update(['notifiable_type' => 'user']);
    }

    public function down(): void
    {
        DB::table('notifications')->where('notifiable_type', 'user')->update(['notifiable_type' => 'App\Models\User']);
    }
};
