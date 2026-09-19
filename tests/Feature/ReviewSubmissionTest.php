<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Producer;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReviewSubmissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_with_delivered_order_can_submit_a_review()
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $order = Order::factory()->for($buyer)->create(['status' => 'delivered']);
        $order->items()->create([
            'product_id' => Product::factory()->for($producer)->create()->id,
            'household_id' => $producer->id,
            'product_name' => 'x', 'unit_price' => 1, 'quantity' => 1, 'subtotal' => 1,
        ]);

        $this->actingAs($buyer)->post(route('reviews.store', $producer), [
            'rating' => 5,
            'comment' => 'Odlično!',
        ])->assertRedirect();

        $this->assertDatabaseHas('reviews', ['user_id' => $buyer->id, 'household_id' => $producer->id, 'rating' => 5]);
    }

    public function test_a_review_can_carry_a_photo_which_is_removed_with_it()
    {
        Storage::fake('public');

        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $order = Order::factory()->for($buyer)->create(['status' => 'delivered']);
        $order->items()->create([
            'product_id' => Product::factory()->for($producer)->create()->id,
            'household_id' => $producer->id,
            'product_name' => 'x', 'unit_price' => 1, 'quantity' => 1, 'subtotal' => 1,
        ]);

        $this->actingAs($buyer)->post(route('reviews.store', $producer), [
            'rating' => 5,
            'comment' => 'Stiglo baš kako se vidi na slici.',
            'image' => UploadedFile::fake()->create('stiglo.jpg', 10, 'image/jpeg'),
        ])->assertRedirect();

        $review = Review::sole();
        $this->assertNotNull($review->image_path);
        Storage::disk('public')->assertExists($review->image_path);

        $this->actingAs($buyer)->delete(route('reviews.destroy', $review))->assertRedirect();
        Storage::disk('public')->assertMissing($review->image_path);
    }

    public function test_buyer_without_a_delivered_order_cannot_submit_a_review()
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();

        $this->actingAs($buyer)->post(route('reviews.store', $producer), ['rating' => 5])
            ->assertForbidden();
    }

    public function test_average_rating_is_shown_on_the_producer_page()
    {
        $producer = Producer::factory()->active()->create();
        Review::factory()->for($producer)->create(['rating' => 4]);
        Review::factory()->for($producer)->create(['rating' => 2]);

        $response = $this->get(route('marketplace.producers.show', $producer));

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
