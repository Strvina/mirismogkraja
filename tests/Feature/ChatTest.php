<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** The chat window's JSON: the same threads as the messages pages, under the same rules. */
class ChatTest extends TestCase
{
    use RefreshDatabase;

    private function thread(): array
    {
        $buyer = User::factory()->create(['name' => 'Milica Kupac']);
        $owner = User::factory()->create();
        $producer = Producer::factory()->for($owner)->active()->create(['name' => 'Pčelinjak Rtanj']);

        return [$buyer, $owner, $producer];
    }

    private function message(Producer $producer, User $buyer, User $sender, string $body): ProducerMessage
    {
        return ProducerMessage::create(['producer_id' => $producer->id, 'buyer_id' => $buyer->id, 'sender_id' => $sender->id, 'body' => $body]);
    }

    public function test_the_list_shows_each_side_who_is_on_the_other_end_and_what_is_unread()
    {
        [$buyer, $owner, $producer] = $this->thread();
        $this->message($producer, $buyer, $buyer, 'Imate li bagremov med?');
        $this->message($producer, $buyer, $buyer, 'I koliko košta?');

        $this->actingAs($owner)->getJson(route('chat.conversations'))
            ->assertOk()
            ->assertJsonPath('unread', 2)
            ->assertJsonPath('threads.0.title', 'Milica Kupac')
            ->assertJsonPath('threads.0.producer_id', $producer->id)
            ->assertJsonPath('threads.0.buyer_id', $buyer->id)
            ->assertJsonPath('threads.0.last_message', 'I koliko košta?')
            ->assertJsonPath('threads.0.last_mine', false)
            ->assertJsonPath('threads.0.unread', 2);

        $this->actingAs($buyer)->getJson(route('chat.conversations'))
            ->assertJsonPath('unread', 0)
            ->assertJsonPath('threads.0.title', 'Pčelinjak Rtanj')
            ->assertJsonPath('threads.0.last_mine', true)
            ->assertJsonPath('threads.0.href', route('messages.show', $producer->slug));
    }

    public function test_only_the_two_sides_can_read_or_write_a_thread()
    {
        [$buyer, $owner, $producer] = $this->thread();
        $stranger = User::factory()->create();
        $this->message($producer, $buyer, $buyer, 'Privatno');

        $this->actingAs($stranger)->getJson(route('chat.thread', [$producer->id, $buyer->id]))->assertForbidden();
        $this->actingAs($stranger)->postJson(route('chat.send', [$producer->id, $buyer->id]), ['body' => 'Upad'])->assertForbidden();
        // Nor can the seller open a "thread" with someone who never wrote.
        $this->actingAs($owner)->getJson(route('chat.thread', [$producer->id, $stranger->id]))->assertForbidden();
        $this->actingAs($owner)->postJson(route('chat.send', [$producer->id, $stranger->id]), ['body' => 'Reklama'])->assertForbidden();

        $this->actingAs($buyer)->getJson(route('chat.thread', [$producer->id, $buyer->id]))->assertOk();
        $this->actingAs($owner)->getJson(route('chat.thread', [$producer->id, $buyer->id]))->assertOk();
        $this->assertSame(1, ProducerMessage::count());
    }

    public function test_a_guest_gets_nothing()
    {
        [$buyer, , $producer] = $this->thread();

        $this->getJson(route('chat.conversations'))->assertUnauthorized();
        $this->getJson(route('chat.thread', [$producer->id, $buyer->id]))->assertUnauthorized();
    }

    public function test_messages_count_as_read_only_when_the_window_says_it_is_in_view()
    {
        [$buyer, $owner, $producer] = $this->thread();
        $this->message($producer, $buyer, $buyer, 'Ima li?');

        // Loaded, but folded away or not yet looked at: still unread.
        $this->actingAs($owner)->getJson(route('chat.thread', [$producer->id, $buyer->id]))
            ->assertJsonPath('unread', 1);
        $this->assertNull(ProducerMessage::first()->read_at);

        $this->actingAs($owner)->getJson(route('chat.thread', [$producer->id, $buyer->id, 'read' => 1]))
            ->assertJsonPath('unread', 0);
        $this->assertNotNull(ProducerMessage::first()->read_at);

        // The header badge on any page says the same.
        $this->actingAs($owner)->get(route('messages.index'))->assertInertia(fn ($page) => $page->where('unreadMessages', 0));
    }

    public function test_a_thread_opens_on_its_newest_messages_and_steps_back_and_forward()
    {
        [$buyer, $owner, $producer] = $this->thread();
        $ids = collect(range(1, 35))->map(fn ($n) => $this->message($producer, $buyer, $n % 2 ? $buyer : $owner, "Poruka {$n}")->id);

        $first = $this->actingAs($buyer)->getJson(route('chat.thread', [$producer->id, $buyer->id]))
            ->assertJsonCount(30, 'messages')
            ->assertJsonPath('has_older', true)
            // Oldest first on screen, ending at the newest.
            ->assertJsonPath('messages.0.body', 'Poruka 6')
            ->assertJsonPath('messages.29.body', 'Poruka 35')
            ->assertJsonPath('messages.29.mine', true)
            ->assertJsonPath('thread.title', 'Pčelinjak Rtanj')
            ->assertJsonPath('thread.can_send', true);

        $this->actingAs($buyer)->getJson(route('chat.thread', [$producer->id, $buyer->id, 'before' => $first->json('messages.0.id')]))
            ->assertJsonCount(5, 'messages')
            ->assertJsonPath('has_older', false)
            ->assertJsonPath('messages.0.body', 'Poruka 1');

        $this->message($producer, $buyer, $owner, 'Nova');

        $this->actingAs($buyer)->getJson(route('chat.thread', [$producer->id, $buyer->id, 'after' => $ids->last()]))
            ->assertJsonCount(1, 'messages')
            ->assertJsonPath('messages.0.body', 'Nova')
            ->assertJsonPath('messages.0.mine', false);
    }

    public function test_sending_answers_with_the_saved_message_and_keeps_the_rules_of_the_page()
    {
        [$buyer, $owner, $producer] = $this->thread();

        // A first message from the window starts the conversation, as on the page.
        $this->actingAs($buyer)->postJson(route('chat.send', [$producer->id, $buyer->id]), ['body' => 'Dobar dan!'])
            ->assertCreated()
            ->assertJsonPath('message.body', 'Dobar dan!')
            ->assertJsonPath('message.mine', true);

        $this->actingAs($owner)->postJson(route('chat.send', [$producer->id, $buyer->id]), ['body' => 'Izvolite.'])->assertCreated();

        $this->actingAs($buyer)->postJson(route('chat.send', [$producer->id, $buyer->id]), ['body' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('body');

        $producer->blockedBuyers()->attach($buyer->id, ['blocked_by' => 'producer']);

        $this->actingAs($buyer)->postJson(route('chat.send', [$producer->id, $buyer->id]), ['body' => 'Ipak?'])->assertForbidden();
        $this->actingAs($buyer)->getJson(route('chat.thread', [$producer->id, $buyer->id]))
            ->assertJsonPath('thread.can_send', false)
            ->assertJsonPath('thread.blocked_by', 'producer');

        $this->assertSame(['Dobar dan!', 'Izvolite.'], ProducerMessage::thread($producer, $buyer)->oldest('id')->pluck('body')->all());
    }

    public function test_a_paused_producer_takes_no_new_conversation_from_the_window_either()
    {
        [$buyer, , $producer] = $this->thread();
        $producer->forceFill(['paused_at' => now()])->save();

        $this->actingAs($buyer)->postJson(route('chat.send', [$producer->id, $buyer->id]), ['body' => 'Ima li?'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('body');
    }
}
