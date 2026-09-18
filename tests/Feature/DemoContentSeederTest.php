<?php

namespace Tests\Feature;

use App\Models\Household;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Database\Seeders\CategoriesSeeder;
use Database\Seeders\DemoContentSeeder;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoContentSeederTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Guards task 1: after seeding, every screen (households, catalog,
     * orders in each status, reviews, an abandoned cart) has real data.
     */
    public function test_seeder_populates_a_realistic_demo_dataset(): void
    {
        $this->seed(RolesSeeder::class);
        $this->seed(CategoriesSeeder::class);
        $this->seed(DemoContentSeeder::class);

        $this->assertTrue(User::where('email', 'admin@gmail.com')->first()?->hasRole('admin'));

        $this->assertSame(6, Household::count());
        $this->assertTrue(Household::where('status', 'active')->count() === 6);

        $this->assertGreaterThan(0, Product::where('status', 'active')->count());
        $this->assertGreaterThan(0, Product::where('status', 'out_of_stock')->count());
        $this->assertGreaterThan(0, Product::where('status', 'draft')->count());
        $this->assertGreaterThan(0, Product::whereHas('images')->count());

        foreach (['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as $status) {
            $this->assertGreaterThan(0, Order::where('status', $status)->count(), "expected at least one {$status} order");
        }

        $this->assertGreaterThan(0, Review::count());
        $this->assertTrue(Review::pluck('rating')->unique()->count() > 1);

        $this->assertGreaterThan(0, User::role('buyer')->count());
        $this->assertGreaterThan(0, User::role('seller')->count());
    }
}
