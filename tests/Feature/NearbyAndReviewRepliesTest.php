<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NearbyAndReviewRepliesTest extends TestCase
{
    use RefreshDatabase;

    public function test_producers_can_be_sorted_by_distance_with_unpinned_ones_last(): void
    {
        // Seen from Niš: Leskovac is ~40 km, Vranje ~100 km, Beograd ~200 km.
        Producer::factory()->active()->create(['name' => 'A Beograd', 'lat' => 44.79, 'lng' => 20.45]);
        Producer::factory()->active()->create(['name' => 'B bez lokacije', 'lat' => null, 'lng' => null]);
        Producer::factory()->active()->create(['name' => 'C Vranje', 'lat' => 42.55, 'lng' => 21.90]);
        Producer::factory()->active()->create(['name' => 'D Leskovac', 'lat' => 42.99, 'lng' => 21.95]);

        $this->get('/proizvodjaci?lat=43.32&lng=21.9')->assertInertia(fn ($page) => $page
            ->where('producers.data.0.name', 'D Leskovac')
            ->where('producers.data.1.name', 'C Vranje')
            ->where('producers.data.2.name', 'A Beograd')
            ->where('producers.data.3.name', 'B bez lokacije')
            ->where('producers.data.3.distance_km', null)
            ->where('filters.lat', 43.32)
            ->where('producers.data.0.distance_km', fn ($km) => $km >= 30 && $km <= 45));

        // Without a position: the usual order, and nonsense is ignored.
        $this->get('/proizvodjaci?lat=abc&lng=999')->assertInertia(fn ($page) => $page
            ->where('producers.data.0.name', 'A Beograd')
            ->where('filters.lat', null));
    }

    public function test_the_page_may_ask_for_the_visitors_location(): void
    {
        $this->get('/')->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()');
    }

    public function test_a_producer_answers_a_review_in_public_and_the_reviewer_hears_once(): void
    {
        $author = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $review = Review::create(['user_id' => $author->id, 'household_id' => $producer->id, 'rating' => 3, 'comment' => 'Kasnila dostava', 'status' => Review::STATUS_APPROVED]);

        $this->actingAs($producer->user)->put(route('reviews.reply', $review), ['reply' => 'Izvinite, bila je gužva.'])->assertSessionHasNoErrors();
        $this->actingAs($producer->user)->put(route('reviews.reply', $review), ['reply' => 'Izvinite, bila je gužva na putu.']);

        $this->assertSame('Izvinite, bila je gužva na putu.', $review->fresh()->reply);
        $this->assertSame(1, $author->notifications()->where('data->type', 'review.replied')->count());

        $this->get(route('marketplace.producers.show', $producer->slug))->assertInertia(fn ($page) => $page
            ->where('reviews.data.0.reply', 'Izvinite, bila je gužva na putu.')
            ->where('canReply', true));

        $this->actingAs($author)->get(route('marketplace.producers.show', $producer->slug))
            ->assertInertia(fn ($page) => $page->where('canReply', false));

        // Emptied: the answer is gone.
        $this->actingAs($producer->user)->put(route('reviews.reply', $review), ['reply' => '']);
        $this->assertNull($review->fresh()->reply);
        $this->assertNull($review->fresh()->replied_at);
    }

    public function test_only_the_reviewed_producer_answers_and_only_published_reviews(): void
    {
        $producer = Producer::factory()->active()->create();
        $approved = Review::create(['user_id' => User::factory()->create()->id, 'household_id' => $producer->id, 'rating' => 5, 'status' => Review::STATUS_APPROVED]);
        $pending = Review::create(['user_id' => User::factory()->create()->id, 'household_id' => $producer->id, 'rating' => 5, 'status' => Review::STATUS_PENDING]);

        $this->actingAs(User::factory()->create())->put(route('reviews.reply', $approved), ['reply' => 'Hvala'])->assertForbidden();
        $this->actingAs($producer->user)->put(route('reviews.reply', $pending), ['reply' => 'Hvala'])->assertForbidden();

        $this->assertNull($approved->fresh()->reply);
    }
}
