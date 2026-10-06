<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        return $admin;
    }

    /**
     * Paged and searchable, and only what the row prints - not the phone
     * numbers and addresses behind it.
     */
    public function test_the_list_is_searchable_and_carries_no_contact_details()
    {
        $this->seed(RolesSeeder::class);
        $admin = $this->admin();
        User::factory()->create(['name' => 'Milica Nikolić', 'phone' => '0601234567']);
        User::factory()->count(3)->create();

        $this->actingAs($admin)->get(route('admin.users.index', ['search' => 'Milica']))->assertInertia(
            fn ($page) => $page->has('users.data', 1)
                ->where('users.data.0.name', 'Milica Nikolić')
                ->missing('users.data.0.phone')
                ->where('filters.search', 'Milica')
        );
    }

    /** Tabs by role and by block, each with its count. */
    public function test_the_list_is_grouped_by_role_and_block()
    {
        $this->seed(RolesSeeder::class);
        $admin = $this->admin();
        User::factory()->create()->assignRole('seller');
        User::factory()->create(['blocked_at' => now()]);

        $this->actingAs($admin)->get(route('admin.users.index', ['group' => 'sellers']))->assertInertia(
            fn ($page) => $page->has('users.data', 1)
                ->where('counts', ['all' => 3, 'sellers' => 1, 'admins' => 1, 'blocked' => 1])
                ->where('filters.group', 'sellers')
        );
        $this->actingAs($admin)->get(route('admin.users.index', ['group' => 'blocked']))
            ->assertInertia(fn ($page) => $page->has('users.data', 1)->whereNot('users.data.0.blocked_at', null));
    }

    public function test_non_admin_cannot_access_user_management()
    {
        $this->seed(RolesSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('buyer');

        $this->actingAs($user)->get(route('admin.users.index'))->assertForbidden();
    }

    public function test_admin_can_change_a_users_roles()
    {
        $this->seed(RolesSeeder::class);
        $admin = $this->admin();
        $user = User::factory()->create();
        $user->assignRole('buyer');

        $this->actingAs($admin)->patch(route('admin.users.roles', $user), ['roles' => ['buyer', 'seller']]);

        $this->assertTrue($user->fresh()->hasRole('seller'));
    }

    public function test_admin_cannot_remove_their_own_admin_role()
    {
        $this->seed(RolesSeeder::class);
        $admin = $this->admin();

        $this->actingAs($admin)->patch(route('admin.users.roles', $admin), ['roles' => ['buyer']])
            ->assertSessionHasErrors('roles');

        $this->assertTrue($admin->fresh()->hasRole('admin'));
    }

    public function test_admin_can_block_and_unblock_a_user()
    {
        $this->seed(RolesSeeder::class);
        $admin = $this->admin();
        $user = User::factory()->create();

        $this->actingAs($admin)->patch(route('admin.users.block', $user));
        $this->assertNotNull($user->fresh()->blocked_at);

        $this->actingAs($admin)->patch(route('admin.users.block', $user));
        $this->assertNull($user->fresh()->blocked_at);
    }

    public function test_admin_cannot_block_themselves()
    {
        $this->seed(RolesSeeder::class);
        $admin = $this->admin();

        $this->actingAs($admin)->patch(route('admin.users.block', $admin))->assertSessionHasErrors('user');
        $this->assertNull($admin->fresh()->blocked_at);
    }

    public function test_blocked_user_cannot_log_in()
    {
        $user = User::factory()->create(['blocked_at' => now()]);

        $this->post('/login', ['email' => $user->email, 'password' => 'password'])
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_blocking_an_active_session_logs_the_user_out_on_next_request()
    {
        $this->seed(RolesSeeder::class);
        $admin = $this->admin();
        $user = User::factory()->create();

        $this->actingAs($user);
        $user->forceFill(['blocked_at' => now()])->save();

        // Any authenticated page will do; the middleware runs on all of them.
        $this->get(route('messages.index'))->assertRedirect(route('login'));
    }
}
