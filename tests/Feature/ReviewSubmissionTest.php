<?php

namespace Tests\Feature;

use App\Models\Household;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewSubmissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_with_delivered_order_can_submit_a_review()
    {
        $buyer = User::factory()->create();
        $household = Household::factory()->active()->create();
        $order = Order::factory()->for($buyer)->create(['status' => 'delivered']);
        $order->items()->create([
            'product_id' => Product::factory()->for($household)->create()->id,
            'household_id' => $household->id,
            'product_name' => 'x', 'unit_price' => 1, 'quantity' => 1, 'subtotal' => 1,
        ]);

        $this->actingAs($buyer)->post(route('reviews.store', $household), [
            'rating' => 5,
            'comment' => 'Odlično!',
        ])->assertRedirect();

        $this->assertDatabaseHas('reviews', ['user_id' => $buyer->id, 'household_id' => $household->id, 'rating' => 5]);
    }

    public function test_buyer_without_a_delivered_order_cannot_submit_a_review()
    {
        $buyer = User::factory()->create();
        $household = Household::factory()->active()->create();

        $this->actingAs($buyer)->post(route('reviews.store', $household), ['rating' => 5])
            ->assertForbidden();
    }

    public function test_average_rating_is_shown_on_the_household_page()
    {
        $household = Household::factory()->active()->create();
        Review::factory()->for($household)->create(['rating' => 4]);
        Review::factory()->for($household)->create(['rating' => 2]);

        $response = $this->get(route('marketplace.households.show', $household));

        $response->assertInertia(fn ($page) => $page->where('averageRating', 3)
            ->has('reviews', 2));
    }

    public function test_author_can_delete_their_review()
    {
        $author = User::factory()->create();
        $review = Review::factory()->for($author)->create();

        $this->actingAs($author)->delete(route('reviews.destroy', $review));

        $this->assertDatabaseMissing('reviews', ['id' => $review->id]);
    }
}
