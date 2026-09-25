<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Review;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Inertia;
use Tests\TestCase;

/**
 * Task 16: the site tells people about the things they would otherwise only
 * find by logging in and looking - a review, an admin's decision about their
 * producer, a new listing from someone they follow.
 *
 * Messages are deliberately not among them: the header already carries an
 * unread badge that polls, and the inbox lists every thread, so a second
 * stream saying the same thing would only bury the rest.
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

    private function approvedProducer(User $admin): Producer
    {
        $producer = Producer::factory()->create(['status' => 'pending']);
        $this->actingAs($admin)->patch(route('admin.producers.status', $producer), ['status' => 'active']);

        return $producer->refresh();
    }

    public function test_a_message_does_not_create_a_notification(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();

        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Imate li jaja?']);
        $this->actingAs($producer->user)->post(route('messages.thread.store', [$producer->id, $buyer->id]), ['body' => 'Imamo.']);

        // The badge counts it; the bell does not repeat it.
        $this->assertSame(0, $producer->user->notifications()->count());
        $this->assertSame(0, $buyer->notifications()->count());

        $this->actingAs($buyer)->get('/')->assertInertia(fn ($page) => $page->where('unreadMessages', 1));
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
        $admin = $this->admin();
        $producer = Producer::factory()->create(['status' => 'pending']);

        $this->actingAs($producer->user)->get('/')->assertInertia(fn ($page) => $page->where('unreadNotifications', 0));

        $this->actingAs($admin)->patch(route('admin.producers.status', $producer), ['status' => 'active']);

        $this->actingAs($producer->user)->get('/')->assertInertia(fn ($page) => $page->where('unreadNotifications', 1));
    }

    /**
     * The list itself is an optional prop: it is built only when the bell
     * asks for it, so it costs nothing on an ordinary page load.
     */
    public function test_the_list_is_only_built_when_asked_for(): void
    {
        $producer = $this->approvedProducer($this->admin());

        $this->actingAs($producer->user)->get('/')->assertInertia(fn ($page) => $page->missing('recentNotifications'));

        $this->actingAs($producer->user)->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => Inertia::getVersion(),
            'X-Inertia-Partial-Component' => 'welcome',
            'X-Inertia-Partial-Data' => 'recentNotifications',
        ])->get('/')->assertJsonCount(1, 'props.recentNotifications');
    }

    public function test_opening_a_notification_marks_it_read_and_forwards_to_its_page(): void
    {
        $producer = $this->approvedProducer($this->admin());
        $owner = $producer->user;
        $notification = $owner->notifications()->sole();

        $this->actingAs($owner)->get(route('notifications.open', $notification->id))
            ->assertRedirect(route('marketplace.producers.show', $producer->slug));

        $this->assertNotNull($notification->refresh()->read_at);
    }

    public function test_a_user_cannot_open_someone_elses_notification(): void
    {
        $producer = $this->approvedProducer($this->admin());
        $notification = $producer->user->notifications()->sole();

        $this->actingAs(User::factory()->create())->get(route('notifications.open', $notification->id))->assertNotFound();
        $this->assertNull($notification->refresh()->read_at);
    }

    public function test_everything_can_be_marked_read_at_once(): void
    {
        $admin = $this->admin();
        $first = Producer::factory()->create(['status' => 'pending']);
        $second = Producer::factory()->for($first->user)->create(['status' => 'pending']);

        $this->actingAs($admin)->patch(route('admin.producers.status', $first), ['status' => 'active']);
        $this->actingAs($admin)->patch(route('admin.producers.status', $second), ['status' => 'active']);

        $owner = $first->user;
        $this->assertSame(2, $owner->unreadNotifications()->count());

        $this->actingAs($owner)->post(route('notifications.read-all'));

        $this->assertSame(0, $owner->unreadNotifications()->count());
    }
}
