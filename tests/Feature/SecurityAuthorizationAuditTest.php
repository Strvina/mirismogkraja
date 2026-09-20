<?php

namespace Tests\Feature;

use App\Models\CartItem;
use App\Models\Category;
use App\Models\Order;
use App\Models\Producer;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Task 8.4: a single place that proves every mutable model with an owner
 * (Producer, Product, Order, Review, plus CartItem) rejects a user acting
 * on someone else's record - i.e. no IDOR via guessable/enumerable IDs.
 * Each of these is also covered in its own feature test from the task that
 * introduced it; this file exists to make the security posture reviewable
 * in one pass rather than scattered across a dozen files.
 */
class SecurityAuthorizationAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_cannot_modify_someone_elses_producer()
    {
        $attacker = User::factory()->create();
        $producer = Producer::factory()->create();

        $this->actingAs($attacker)->put(route('producers.update', $producer), ['name' => 'x'])->assertForbidden();
        $this->actingAs($attacker)->delete(route('producers.destroy', $producer))->assertForbidden();
    }

    public function test_a_user_cannot_modify_a_product_in_someone_elses_producer()
    {
        $attacker = User::factory()->create();
        $product = Product::factory()->create();

        $this->actingAs($attacker)
            ->put(route('producers.products.update', [$product->producer, $product]), ['name' => 'x'])
            ->assertForbidden();
        $this->actingAs($attacker)
            ->delete(route('producers.products.destroy', [$product->producer, $product]))
            ->assertForbidden();
    }

    public function test_a_user_cannot_view_or_act_on_an_order_they_have_no_part_in()
    {
        $stranger = User::factory()->create();
        $order = Order::factory()->create();

        $this->actingAs($stranger)->get(route('orders.show', $order))->assertForbidden();
        $this->actingAs($stranger)->patch(route('orders.status', $order), ['status' => 'contacted'])->assertForbidden();
    }

    public function test_a_user_cannot_delete_someone_elses_review()
    {
        $attacker = User::factory()->create();
        $review = Review::factory()->create();

        $this->actingAs($attacker)->delete(route('reviews.destroy', $review))->assertForbidden();
    }

    public function test_a_user_cannot_touch_someone_elses_cart_item()
    {
        $attacker = User::factory()->create();
        $item = CartItem::factory()->create();

        $this->actingAs($attacker)->patch(route('cart.update', $item), ['quantity' => 5])->assertForbidden();
        $this->actingAs($attacker)->delete(route('cart.destroy', $item))->assertForbidden();
    }

    public function test_non_admin_cannot_reach_any_admin_route()
    {
        $user = User::factory()->create();
        $category = Category::factory()->create();

        $this->actingAs($user)->get(route('admin.dashboard'))->assertForbidden();
        $this->actingAs($user)->get(route('admin.users.index'))->assertForbidden();
        $this->actingAs($user)->get(route('admin.producers.index'))->assertForbidden();
        $this->actingAs($user)->get(route('admin.products.index'))->assertForbidden();
        $this->actingAs($user)->get(route('admin.orders.index'))->assertForbidden();
        $this->actingAs($user)->get(route('admin.reviews.index'))->assertForbidden();
        $this->actingAs($user)->delete(route('admin.categories.destroy', $category))->assertForbidden();
    }
}
