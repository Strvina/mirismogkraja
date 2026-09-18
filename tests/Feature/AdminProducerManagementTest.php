<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminProducerManagementTest extends TestCase
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

        $this->actingAs($user)->get(route('admin.producers.index'))->assertForbidden();
    }

    public function test_admin_can_approve_a_pending_producer()
    {
        $admin = $this->admin();
        $producer = Producer::factory()->create(['status' => 'pending']);

        $this->actingAs($admin)->patch(route('admin.producers.status', $producer), ['status' => 'active']);

        $this->assertSame('active', $producer->fresh()->status);
    }

    public function test_admin_can_block_a_producer()
    {
        $admin = $this->admin();
        $producer = Producer::factory()->active()->create();

        $this->actingAs($admin)->patch(route('admin.producers.status', $producer), ['status' => 'blocked']);

        $this->assertSame('blocked', $producer->fresh()->status);
    }
}
