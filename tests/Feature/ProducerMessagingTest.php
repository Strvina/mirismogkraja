<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMessage;
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
            ->assertInertia(fn ($page) => $page->has('messages', 0));
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
}
