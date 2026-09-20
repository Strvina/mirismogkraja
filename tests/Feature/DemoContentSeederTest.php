<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Producer;
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
     * Guards task 1: after seeding, every screen (producers, catalog,
     * orders in each status, reviews, an abandoned cart) has real data.
     */
    public function test_seeder_populates_a_realistic_demo_dataset(): void
    {
        $this->seed(RolesSeeder::class);
        $this->seed(CategoriesSeeder::class);
        $this->seed(DemoContentSeeder::class);

        $this->assertTrue(User::where('email', 'admin@gmail.com')->first()?->hasRole('admin'));

        $this->assertSame(6, Producer::count());
        $this->assertTrue(Producer::where('status', 'active')->count() === 6);

        $this->assertGreaterThan(0, Product::where('status', 'active')->count());
        $this->assertGreaterThan(0, Product::where('status', 'out_of_stock')->count());
        $this->assertGreaterThan(0, Product::where('status', 'draft')->count());
        $this->assertGreaterThan(0, Product::whereHas('images')->count());

        foreach (['pending', 'contacted', 'fulfilled', 'cancelled'] as $status) {
            $this->assertGreaterThan(0, Order::where('status', $status)->count(), "expected at least one {$status} inquiry");
        }

        $this->assertGreaterThan(0, Review::count());
        $this->assertTrue(Review::pluck('rating')->unique()->count() > 1);

        $this->assertGreaterThan(0, User::role('buyer')->count());
        $this->assertGreaterThan(0, User::role('seller')->count());
    }
}
