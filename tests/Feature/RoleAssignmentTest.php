<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesSeeder::class);
    }

    public function test_a_user_can_hold_both_buyer_and_seller_roles_at_once()
    {
        $user = User::factory()->create();
        $user->assignRole('buyer');

        $user->assignRole('seller');

        $this->assertTrue($user->hasRole('buyer'));
        $this->assertTrue($user->hasRole('seller'));
        $this->assertFalse($user->hasRole('admin'));
    }

    public function test_assigning_a_role_twice_does_not_duplicate_it()
    {
        $user = User::factory()->create();

        $user->assignRole('buyer');
        $user->assignRole('buyer');

        $this->assertCount(1, $user->roles);
    }
}
