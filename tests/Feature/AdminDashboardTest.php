<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_shows_correct_counts_and_revenue()
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        User::factory()->count(2)->create();
        $seller = User::factory()->create();
        $producer = Producer::factory()->for($seller)->create();
        Producer::factory()->for($seller)->count(2)->create();
        Product::factory()->for($producer)->count(4)->create();
        Order::factory()->create(['status' => 'delivered', 'total_price' => 100]);
        Order::factory()->create(['status' => 'cancelled', 'total_price' => 500]);
        Order::factory()->create(['status' => 'pending', 'total_price' => 200]);

        $response = $this->actingAs($admin)->get(route('admin.dashboard'));

        $response->assertInertia(fn ($page) => $page->where('stats.producers', 3)
            ->where('stats.products', 4)
            ->where('stats.orders', 3)
            ->where('stats.revenue', 100));
    }
}
