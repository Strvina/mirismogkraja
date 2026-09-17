<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesSeeder::class);
    }

    public function test_guest_is_redirected_to_login()
    {
        $this->get(route('admin.dashboard'))->assertRedirect('/login');
    }

    public function test_non_admin_user_is_forbidden()
    {
        $user = User::factory()->create();
        $user->assignRole('buyer');

        $this->actingAs($user)->get(route('admin.dashboard'))->assertForbidden();
    }

    public function test_admin_can_access()
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)->get(route('admin.dashboard'))->assertOk();
    }
}
