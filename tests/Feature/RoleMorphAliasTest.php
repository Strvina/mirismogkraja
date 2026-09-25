<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Roles are stored polymorphically, so they are only ever found under the
 * type Eloquent writes today. Adding 'user' to the morph map once cut every
 * existing assignment loose and locked the admin out of their own panel;
 * these tests fail if that type drifts again.
 */
class RoleMorphAliasTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_role_is_stored_under_the_morph_alias(): void
    {
        $this->seed(RolesSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('admin');

        $this->assertSame('user', DB::table('model_has_roles')->where('model_id', $user->id)->value('model_type'));
        $this->assertTrue($user->fresh()->hasRole('admin'));
    }

    /** Rows written before the alias existed still have to resolve. */
    public function test_assignments_written_under_the_old_class_name_are_migrated(): void
    {
        $this->seed(RolesSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('admin');

        // Put it back the way it was stored before the morph map changed.
        DB::table('model_has_roles')->where('model_id', $user->id)->update(['model_type' => 'App\Models\User']);
        $this->assertFalse($user->fresh()->hasRole('admin'));

        DB::table('model_has_roles')->where('model_type', 'App\Models\User')->update(['model_type' => 'user']);

        $this->assertTrue($user->fresh()->hasRole('admin'));
    }

    public function test_an_admin_reaches_the_panel(): void
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)->get(route('admin.dashboard'))->assertOk();
    }
}
