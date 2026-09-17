<?php

namespace Tests\Feature;

use App\Models\Household;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminHouseholdManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        return $admin;
    }

    public function test_non_admin_cannot_access()
    {
        $this->seed(RolesSeeder::class);
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.households.index'))->assertForbidden();
    }

    public function test_admin_can_approve_a_pending_household()
    {
        $admin = $this->admin();
        $household = Household::factory()->create(['status' => 'pending']);

        $this->actingAs($admin)->patch(route('admin.households.status', $household), ['status' => 'active']);

        $this->assertSame('active', $household->fresh()->status);
    }

    public function test_admin_can_block_a_household()
    {
        $admin = $this->admin();
        $household = Household::factory()->active()->create();

        $this->actingAs($admin)->patch(route('admin.households.status', $household), ['status' => 'blocked']);

        $this->assertSame('blocked', $household->fresh()->status);
    }
}
