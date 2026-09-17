<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminOrderListTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access()
    {
        $this->seed(RolesSeeder::class);
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.orders.index'))->assertForbidden();
    }

    public function test_admin_sees_all_orders()
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Order::factory()->count(3)->create();

        $response = $this->actingAs($admin)->get(route('admin.orders.index'));

        $response->assertInertia(fn ($page) => $page->has('orders', 3));
    }

    public function test_admin_can_view_any_order_detail()
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $order = Order::factory()->create();

        $this->actingAs($admin)->get(route('orders.show', $order))->assertOk();
    }
}
