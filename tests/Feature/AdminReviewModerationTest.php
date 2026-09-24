<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Review;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class AdminReviewModerationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        return $admin;
    }

    public function test_non_admin_cannot_access()
    {
        $this->seed(RolesSeeder::class);
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.reviews.index'))->assertForbidden();
        $this->actingAs($user)->patch(route('admin.reviews.approve', Review::factory()->create()))->assertForbidden();
    }

    public function test_admin_can_delete_any_review()
    {
        $review = Review::factory()->create();

        $this->actingAs($this->admin())->delete(route('admin.reviews.destroy', $review));

        $this->assertDatabaseMissing('reviews', ['id' => $review->id]);
    }

    /** A new review is held back until someone approves it. */
    public function test_a_submitted_review_starts_pending_and_is_not_public()
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        ProducerMessage::create(['household_id' => $producer->id, 'buyer_id' => $buyer->id, 'sender_id' => $buyer->id, 'body' => 'Pitanje']);
        ProducerMessage::create(['household_id' => $producer->id, 'buyer_id' => $buyer->id, 'sender_id' => $producer->user_id, 'body' => 'Odgovor']);

        $this->actingAs($buyer)->post(route('reviews.store', $producer), ['rating' => 5, 'comment' => 'Odlično!']);

        $this->assertDatabaseHas('reviews', [
            'user_id' => $buyer->id,
            'status' => Review::STATUS_PENDING,
            'approved_at' => null,
        ]);

        // Its author is told why it isn't showing...
        $this->actingAs($buyer)->get(route('marketplace.producers.show', $producer->slug))
            ->assertInertia(fn ($page) => $page->has('reviews.data', 0)->where('myPendingReview', true));

        // ...while for everyone else it simply isn't there.
        Auth::logout();

        $this->get(route('marketplace.producers.show', $producer->slug))
            ->assertInertia(fn ($page) => $page->has('reviews.data', 0)->where('averageRating', 0)->where('myPendingReview', false));
    }

    public function test_approving_a_review_publishes_it()
    {
        $producer = Producer::factory()->active()->create();
        $review = Review::factory()->pending()->for($producer, 'producer')->create(['rating' => 4]);

        $this->actingAs($this->admin())->patch(route('admin.reviews.approve', $review))->assertRedirect();

        $review->refresh();
        $this->assertSame(Review::STATUS_APPROVED, $review->status);
        $this->assertNotNull($review->approved_at);

        $this->get(route('marketplace.producers.show', $producer->slug))
            ->assertInertia(fn ($page) => $page->has('reviews.data', 1)->where('averageRating', 4));
    }

    public function test_rejecting_a_review_keeps_it_off_the_public_page()
    {
        $producer = Producer::factory()->active()->create();
        $review = Review::factory()->for($producer, 'producer')->create();

        $this->actingAs($this->admin())->patch(route('admin.reviews.reject', $review))->assertRedirect();

        $this->assertSame(Review::STATUS_REJECTED, $review->refresh()->status);
        $this->assertNull($review->approved_at);

        $this->get(route('marketplace.producers.show', $producer->slug))
            ->assertInertia(fn ($page) => $page->has('reviews.data', 0));
    }

    /**
     * The public page stamps "pre 2 dana" off approved_at, so a review that
     * was pulled down and later put back has to carry the date it went back
     * up, not the one it originally had.
     */
    public function test_re_approving_after_a_rejection_stamps_a_fresh_time()
    {
        $review = Review::factory()->create(['approved_at' => now()->subMonth()]);
        $originalApproval = $review->approved_at;
        $admin = $this->admin();

        $this->actingAs($admin)->patch(route('admin.reviews.reject', $review));
        $this->actingAs($admin)->patch(route('admin.reviews.approve', $review));

        // Rejecting clears the stamp; approving again has to set a fresh one
        // rather than resurrect the old, now-meaningless date.
        $this->assertNotNull($review->refresh()->approved_at);
        $this->assertTrue($review->approved_at->greaterThan($originalApproval));
    }

    /** The queue defaults to what still needs a decision. */
    public function test_the_queue_lists_pending_reviews_first()
    {
        Review::factory()->pending()->create();
        Review::factory()->create();

        $this->actingAs($this->admin())->get(route('admin.reviews.index'))
            ->assertInertia(fn ($page) => $page->where('filters.status', Review::STATUS_PENDING)
                ->has('reviews', 1)
                ->where('counts.pending', 1)
                ->where('counts.approved', 1));

        $this->actingAs($this->admin())->get(route('admin.reviews.index', ['status' => Review::STATUS_APPROVED]))
            ->assertInertia(fn ($page) => $page->has('reviews', 1));
    }
}
