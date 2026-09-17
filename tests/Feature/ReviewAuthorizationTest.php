<?php

namespace Tests\Feature;

use App\Models\Household;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function deliveredOrderFor(User $buyer, Household $household): Order
    {
        $order = Order::factory()->for($buyer)->create(['status' => 'delivered']);
        $order->items()->create([
            'product_id' => Product::factory()->for($household)->create()->id,
            'household_id' => $household->id,
            'product_name' => 'x', 'unit_price' => 1, 'quantity' => 1, 'subtotal' => 1,
        ]);

        return $order;
    }

    public function test_buyer_with_delivered_order_can_review_the_household()
    {
        $buyer = User::factory()->create();
        $household = Household::factory()->create();
        $this->deliveredOrderFor($buyer, $household);

        $this->assertTrue($buyer->can('create', [Review::class, $household]));
    }

    public function test_buyer_without_any_order_cannot_review()
    {
        $buyer = User::factory()->create();
        $household = Household::factory()->create();

        $this->assertFalse($buyer->can('create', [Review::class, $household]));
    }

    public function test_buyer_with_only_a_pending_order_cannot_review_yet()
    {
        $buyer = User::factory()->create();
        $household = Household::factory()->create();
        $order = Order::factory()->for($buyer)->create(['status' => 'pending']);
        $order->items()->create([
            'product_id' => Product::factory()->for($household)->create()->id,
            'household_id' => $household->id,
            'product_name' => 'x', 'unit_price' => 1, 'quantity' => 1, 'subtotal' => 1,
        ]);

        $this->assertFalse($buyer->can('create', [Review::class, $household]));
    }

    public function test_buyer_cannot_review_the_same_household_twice()
    {
        $buyer = User::factory()->create();
        $household = Household::factory()->create();
        $this->deliveredOrderFor($buyer, $household);
        Review::factory()->for($buyer)->for($household)->create();

        $this->assertFalse($buyer->can('create', [Review::class, $household]));
    }

    public function test_only_the_author_can_update_or_delete_their_review()
    {
        $author = User::factory()->create();
        $stranger = User::factory()->create();
        $review = Review::factory()->for($author)->create();

        $this->assertTrue($author->can('update', $review));
        $this->assertFalse($stranger->can('update', $review));
        $this->assertTrue($author->can('delete', $review));
        $this->assertFalse($stranger->can('delete', $review));
    }
}
