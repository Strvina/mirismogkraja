<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Adding 'user' to the morph map (for reports, task 21) silently cut
     * every existing role assignment loose.
     *
     * Spatie stores the owner of a role as a polymorphic row, and Eloquent
     * writes whatever `getMorphClass()` returns - the raw class name while no
     * alias existed, the alias once one did. Rows written before the change
     * still said `App\Models\User`, so a lookup for `user` matched none of
     * them and every account lost its roles at once. The admin panel then
     * answered "no permission" to the admin.
     *
     * This rewrites the old rows onto the alias. Adding an alias for a class
     * that already has stored morph rows always needs a migration like this
     * one; that is the price of keeping class names out of the database.
     */
    public function up(): void
    {
        foreach (['model_has_roles', 'model_has_permissions'] as $table) {
            DB::table($table)->where('model_type', 'App\Models\User')->update(['model_type' => 'user']);
        }
    }

    public function down(): void
    {
        foreach (['model_has_roles', 'model_has_permissions'] as $table) {
            DB::table($table)->where('model_type', 'user')->update(['model_type' => 'App\Models\User']);
        }
    }
};
