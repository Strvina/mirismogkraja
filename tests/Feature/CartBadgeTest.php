<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartBadgeTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_shared_cart_count_sums_quantities_not_rows(): void
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->active()->create();

        $user->cartItems()->create(['product_id' => Product::factory()->for($producer)->create()->id, 'quantity' => 2]);
        $user->cartItems()->create(['product_id' => Product::factory()->for($producer)->create()->id, 'quantity' => 3]);

        $this->actingAs($user)->get('/')->assertInertia(fn ($page) => $page->where('cartCount', 5));
    }

    public function test_guests_have_an_empty_cart_count(): void
    {
        $this->get('/')->assertInertia(fn ($page) => $page->where('cartCount', 0));
    }
}
