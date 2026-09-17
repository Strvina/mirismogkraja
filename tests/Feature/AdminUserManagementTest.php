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
        $user->update(['blocked_at' => now()]);

        $this->get(route('dashboard'))->assertRedirect(route('login'));
    }
}
