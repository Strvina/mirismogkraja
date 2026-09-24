<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProducerMessagingTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_buyer_can_message_a_producer_and_the_owner_can_reply(): void
    {
        $buyer = User::factory()->create();
        $owner = User::factory()->create();
        $producer = Producer::factory()->for($owner)->active()->create();

        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Imate li ajvar?'])
            ->assertRedirect();

        $this->actingAs($owner)->post(route('messages.thread.store', [$producer->id, $buyer->id]), ['body' => 'Imamo.'])
            ->assertRedirect();

        $this->assertSame(
            ['Imate li ajvar?', 'Imamo.'],
            ProducerMessage::thread($producer, $buyer)->oldest()->pluck('body')->all()
        );
    }

    public function test_a_thread_is_private_to_its_two_sides(): void
    {
        $buyer = User::factory()->create();
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $producer = Producer::factory()->for($owner)->active()->create();

        ProducerMessage::create([
            'household_id' => $producer->id,
            'buyer_id' => $buyer->id,
            'sender_id' => $buyer->id,
            'body' => 'Privatno',
        ]);

        // A stranger asking for that buyer's thread is refused...
        $this->actingAs($stranger)->get(route('messages.thread', [$producer->id, $buyer->id]))->assertForbidden();

        // ...and can't write into it either.
        $this->actingAs($stranger)->post(route('messages.thread.store', [$producer->id, $buyer->id]), ['body' => 'Upad'])
            ->assertForbidden();

        // The stranger's own thread with the same producer is separate.
        $this->actingAs($stranger)->get(route('messages.show', $producer->slug))
            ->assertInertia(fn ($page) => $page->has('messages.data', 0));
    }

    public function test_opening_a_thread_marks_the_other_sides_messages_as_read(): void
    {
        $buyer = User::factory()->create();
        $owner = User::factory()->create();
        $producer = Producer::factory()->for($owner)->active()->create();

        $message = ProducerMessage::create([
            'household_id' => $producer->id,
            'buyer_id' => $buyer->id,
            'sender_id' => $buyer->id,
            'body' => 'Pitanje',
        ]);

        $this->actingAs($owner)->get(route('messages.thread', [$producer->id, $buyer->id]))->assertOk();
        $this->assertNotNull($message->refresh()->read_at);
    }

    public function test_an_owner_cannot_open_a_thread_with_their_own_producer(): void
    {
        $owner = User::factory()->create();
        $producer = Producer::factory()->for($owner)->active()->create();

        $this->actingAs($owner)->get(route('messages.show', $producer->slug))->assertForbidden();
    }

    public function test_the_unread_badge_counts_messages_waiting_for_each_side(): void
    {
        $buyer = User::factory()->create();
        $owner = User::factory()->create();
        $producer = Producer::factory()->for($owner)->active()->create();

        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Pitanje']);

        // The sender sees nothing; the producer's owner sees one waiting.
        $this->actingAs($buyer)->get('/')->assertInertia(fn ($page) => $page->where('unreadMessages', 0));
        $this->actingAs($owner)->get('/')->assertInertia(fn ($page) => $page->where('unreadMessages', 1));

        // Reading the thread clears it, and the reply flips it to the buyer.
        $this->actingAs($owner)->get(route('messages.thread', [$producer->id, $buyer->id]));
        $this->actingAs($owner)->post(route('messages.thread.store', [$producer->id, $buyer->id]), ['body' => 'Odgovor']);

        $this->actingAs($owner)->get('/')->assertInertia(fn ($page) => $page->where('unreadMessages', 0));
        $this->actingAs($buyer)->get('/')->assertInertia(fn ($page) => $page->where('unreadMessages', 1));
    }

    public function test_the_inbox_lists_one_entry_per_thread(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();

        foreach (['Prva', 'Druga'] as $body) {
            ProducerMessage::create([
                'household_id' => $producer->id,
                'buyer_id' => $buyer->id,
                'sender_id' => $buyer->id,
                'body' => $body,
            ]);
        }

        $this->actingAs($buyer)->get(route('messages.index'))
            ->assertInertia(fn ($page) => $page->has('threads', 1)->where('threads.0.last_message', 'Druga'));
    }

    public function test_the_inbox_shows_threads_from_both_sides(): void
    {
        $user = User::factory()->create();
        $ownProducer = Producer::factory()->for($user)->active()->create(['name' => 'Moj proizvođač']);
        $otherProducer = Producer::factory()->active()->create(['name' => 'Tuđi proizvođač']);
        $customer = User::factory()->create(['name' => 'Kupac Kupčević']);

        // Someone wrote to the producer this user owns...
        ProducerMessage::create([
            'household_id' => $ownProducer->id,
            'buyer_id' => $customer->id,
            'sender_id' => $customer->id,
            'body' => 'Pitanje za moj proizvod',
        ]);

        // ...and the same user wrote to a different producer as a buyer.
        ProducerMessage::create([
            'household_id' => $otherProducer->id,
            'buyer_id' => $user->id,
            'sender_id' => $user->id,
            'body' => 'Moje pitanje njima',
        ]);

        $this->actingAs($user)->get(route('messages.index'))->assertInertia(
            fn ($page) => $page->has('threads', 2)
                ->where('threads.0.title', 'Tuđi proizvođač')
                ->where('threads.0.as_producer', false)
                ->where('threads.1.title', 'Kupac Kupčević')
                ->where('threads.1.as_producer', true)
                ->where('threads.1.subtitle', 'Moj proizvođač')
        );
    }

    /**
     * A thread has to show which listing the question was about, with enough
     * of it - picture and price - to recognise at a glance.
     */
    public function test_a_thread_carries_the_products_thumbnail_and_price(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $product = Product::factory()->for($producer)->create(['status' => 'active', 'name' => 'Domaći ajvar', 'price' => 900]);
        $product->images()->create(['path' => 'products/ajvar.jpg', 'order' => 0]);

        $this->actingAs($buyer)->post(route('inquiries.store', $product->slug), ['body' => 'Imate li još?']);

        $this->actingAs($buyer)->get(route('messages.show', $producer->slug))->assertInertia(
            fn ($page) => $page->where('messages.data.0.product.name', 'Domaći ajvar')
                ->where('messages.data.0.product.slug', $product->slug)
                ->where('messages.data.0.product.image', 'products/ajvar.jpg')
                ->where('messages.data.0.product.price', '900.00')
        );
    }

    /**
     * The whole point of the inbox row: it has to show the newest message in
     * the thread, including one the viewer has only just sent. A reply that
     * lands in the same second as the question it answers must not be
     * ordered behind it.
     */
    public function test_the_inbox_row_shows_the_reply_that_was_just_sent(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $owner = $producer->user;

        $this->travelTo(now()->startOfSecond());

        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Imate li jaja?']);

        // The owner reads the thread and answers from it, as they would.
        $this->actingAs($owner)->get(route('messages.thread', [$producer->id, $buyer->id]));
        $this->actingAs($owner)->post(route('messages.thread.store', [$producer->id, $buyer->id]), ['body' => 'Imamo, javite se.']);

        // Both messages share a created_at second, so only the id can tell
        // them apart.
        $this->assertSame(1, ProducerMessage::distinct()->count('created_at'));

        $this->actingAs($owner)->get(route('messages.index'))->assertInertia(
            fn ($page) => $page->where('threads.0.last_message', 'Imamo, javite se.')
                ->where('threads.0.unread', 0)
        );

        $this->actingAs($owner)->get(route('messages.inbox'))->assertInertia(
            fn ($page) => $page->where('threads.0.last_message', 'Imamo, javite se.')
        );
    }

    /**
     * Inertia restores a visited page's props from history on Back. Sending
     * a message, and reading one, both make those snapshots wrong, so the
     * response has to tell the client to drop them - otherwise the inbox the
     * user backs out to still shows the state from before.
     */
    public function test_sending_and_reading_messages_invalidates_cached_pages(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();

        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Pitanje'])
            ->assertSessionHas('inertia.clear_history', true);

        // Opening the thread marks the producer's reply as read.
        $this->actingAs($producer->user)->post(route('messages.thread.store', [$producer->id, $buyer->id]), ['body' => 'Odgovor']);

        // A page render consumes the flag itself, so here it shows up on the
        // Inertia response rather than in the session.
        $this->actingAs($buyer)->inertiaGet(route('messages.show', $producer->slug))
            ->assertJsonPath('clearHistory', true);

        // Nothing changed the second time round, so there is nothing to
        // invalidate either.
        $this->actingAs($buyer)->inertiaGet(route('messages.show', $producer->slug))
            ->assertJsonPath('clearHistory', false);
    }

    /** Reading a thread has to clear the header badge for good. */
    public function test_the_badge_stays_cleared_after_a_thread_is_read(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();

        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Pitanje']);
        $this->actingAs($producer->user)->post(route('messages.thread.store', [$producer->id, $buyer->id]), ['body' => 'Odgovor']);

        $this->actingAs($buyer)->get(route('messages.index'))
            ->assertInertia(fn ($page) => $page->where('threads.0.unread', 1)->where('unreadMessages', 1));

        $this->actingAs($buyer)->get(route('messages.show', $producer->slug));

        // Both the row and the badge, on a freshly requested inbox.
        $this->actingAs($buyer)->get(route('messages.index'))
            ->assertInertia(fn ($page) => $page->where('threads.0.unread', 0)
                ->where('threads.0.last_message', 'Odgovor')
                ->where('unreadMessages', 0));
    }
}
