<?php

namespace Tests\Feature;

use App\Models\CartItem;
use App\Models\Household;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Database\Seeders\CategoriesSeeder;
use Database\Seeders\DemoContentSeeder;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoContentSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_two_active_households_with_a_product_per_category()
    {
        $this->seed(RolesSeeder::class);
        $this->seed(CategoriesSeeder::class);
        $this->seed(DemoContentSeeder::class);

        $this->assertSame(2, Household::count());
        $this->assertTrue(Household::where('status', 'active')->count() === 2);

        $household = Household::first();
        $this->assertTrue($household->user->hasRole('seller'));
        $this->assertSame(9, Product::where('household_id', $household->id)->count());
    }

    public function test_it_seeds_orders_a_review_and_a_pending_cart()
    {
        $this->seed(RolesSeeder::class);
        $this->seed(CategoriesSeeder::class);
        $this->seed(DemoContentSeeder::class);

        $this->assertSame(2, Order::count());
        $this->assertSame(1, Order::where('status', 'delivered')->count());
        $this->assertSame(1, Order::where('status', 'pending')->count());
        $this->assertSame(1, Review::count());
        $this->assertSame(2, CartItem::count());
    }
}
