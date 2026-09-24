<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Inertia;
use Tests\TestCase;

/**
 * Task 16: the site tells people about the things they would otherwise only
 * find by logging in and looking - a message, a review, and an admin's
 * decision about their producer.
 */
class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        return $admin;
    }

    public function test_a_producer_is_told_when_a_buyer_writes_to_them(): void
    {
        $buyer = User::factory()->create(['name' => 'Milica']);
        $producer = Producer::factory()->active()->create();

        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Imate li jaja?']);

        $notification = $producer->user->notifications()->sole();

        $this->assertSame('message.received', $notification->data['type']);
        $this->assertStringContainsString('Milica', $notification->data['title']);
        $this->assertStringContainsString('jaja', $notification->data['body']);

        // The buyer hears nothing about their own message.
        $this->assertSame(0, $buyer->notifications()->count());
    }

    /** ...and the buyer is told when the producer writes back. */
    public function test_a_buyer_is_told_when_the_producer_replies(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create(['name' => 'Mlekara Zapis']);

        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Pitanje']);
        $this->actingAs($producer->user)->post(route('messages.thread.store', [$producer->id, $buyer->id]), ['body' => 'Odgovor']);

        $this->assertStringContainsString('Mlekara Zapis', $buyer->notifications()->sole()->data['title']);
    }

    public function test_an_inquiry_from_a_product_page_notifies_the_producer(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $product = Product::factory()->for($producer)->create(['status' => 'active']);

        $this->actingAs($buyer)->post(route('inquiries.store', $product->slug), ['body' => 'Koliko kosta?']);

        $this->assertSame(1, $producer->user->notifications()->count());
    }

    public function test_approving_and_blocking_a_producer_notifies_its_owner(): void
    {
        $admin = $this->admin();
        $producer = Producer::factory()->create(['status' => 'pending']);

        $this->actingAs($admin)->patch(route('admin.producers.status', $producer), ['status' => 'active']);
        $this->assertSame('producer.approved', $producer->user->notifications()->sole()->data['type']);

        $this->actingAs($admin)->patch(route('admin.producers.status', $producer), ['status' => 'blocked']);
        $this->assertSame(2, $producer->user->notifications()->count());

        // Saving the same status again is not a decision, so it says nothing.
        $this->actingAs($admin)->patch(route('admin.producers.status', $producer), ['status' => 'blocked']);
        $this->assertSame(2, $producer->user->notifications()->count());
    }

    public function test_a_review_notifies_the_producer_and_its_author_when_published(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        ProducerMessage::create(['household_id' => $producer->id, 'buyer_id' => $buyer->id, 'sender_id' => $buyer->id, 'body' => 'Pitanje']);
        ProducerMessage::create(['household_id' => $producer->id, 'buyer_id' => $buyer->id, 'sender_id' => $producer->user_id, 'body' => 'Odgovor']);

        $this->actingAs($buyer)->post(route('reviews.store', $producer), ['rating' => 5, 'comment' => 'Odlično']);

        // The producer hears about the review; the author hears nothing yet,
        // since it is not public.
        $this->assertSame('review.received', $producer->user->notifications()->latest()->first()->data['type']);
        $this->assertSame(0, $buyer->notifications()->count());

        $this->actingAs($this->admin())->patch(route('admin.reviews.approve', Review::sole()));

        $this->assertSame('review.published', $buyer->notifications()->sole()->data['type']);
    }

    public function test_the_unread_count_is_shared_with_every_page(): void
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->active()->create();

        $this->actingAs($producer->user)->get('/')->assertInertia(fn ($page) => $page->where('unreadNotifications', 0));

        $this->actingAs($user)->post(route('messages.store', $producer->slug), ['body' => 'Zdravo']);

        $this->actingAs($producer->user)->get('/')->assertInertia(fn ($page) => $page->where('unreadNotifications', 1));
    }

    /**
     * The list itself is an optional prop: it is built only when the bell
     * asks for it, so it costs nothing on an ordinary page load.
     */
    public function test_the_list_is_only_built_when_asked_for(): void
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $this->actingAs($user)->post(route('messages.store', $producer->slug), ['body' => 'Zdravo']);

        $this->actingAs($producer->user)->get('/')->assertInertia(fn ($page) => $page->missing('notifications'));

        $this->actingAs($producer->user)->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => Inertia::getVersion(),
            'X-Inertia-Partial-Component' => 'welcome',
            'X-Inertia-Partial-Data' => 'notifications',
        ])->get('/')->assertJsonCount(1, 'props.notifications');
    }

    public function test_opening_a_notification_marks_it_read_and_forwards_to_its_page(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Zdravo']);

        $owner = $producer->user;
        $notification = $owner->notifications()->sole();

        $this->actingAs($owner)->get(route('notifications.open', $notification->id))
            ->assertRedirect(route('messages.thread', [$producer->id, $buyer->id]));

        $this->assertNotNull($notification->refresh()->read_at);
    }

    public function test_a_user_cannot_open_someone_elses_notification(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Zdravo']);

        $notification = $producer->user->notifications()->sole();

        $this->actingAs($buyer)->get(route('notifications.open', $notification->id))->assertNotFound();
        $this->assertNull($notification->refresh()->read_at);
    }

    public function test_everything_can_be_marked_read_at_once(): void
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $this->actingAs($user)->post(route('messages.store', $producer->slug), ['body' => 'Prva']);
        $this->actingAs($user)->post(route('messages.store', $producer->slug), ['body' => 'Druga']);

        $owner = $producer->user;
        $this->assertSame(2, $owner->unreadNotifications()->count());

        $this->actingAs($owner)->post(route('notifications.read-all'));

        $this->assertSame(0, $owner->unreadNotifications()->count());
    }
}
