<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The summary kept beside the messages (App\Models\Conversation): each new
 * message and each thread read keeps it current, and working it out again
 * from the messages gives the same answer.
 */
class ConversationTest extends TestCase
{
    use RefreshDatabase;

    private Producer $producer;

    private User $buyer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->producer = Producer::factory()->active()->create();
        $this->buyer = User::factory()->create();
    }

    private function write(User $sender, string $body = 'Poruka'): ProducerMessage
    {
        return ProducerMessage::create(['producer_id' => $this->producer->id, 'buyer_id' => $this->buyer->id, 'sender_id' => $sender->id, 'body' => $body]);
    }

    private function conversation(): Conversation
    {
        return Conversation::where('producer_id', $this->producer->id)->where('buyer_id', $this->buyer->id)->sole();
    }

    public function test_each_message_is_the_newest_and_one_more_for_the_other_side_to_read(): void
    {
        $this->write($this->buyer);
        $this->write($this->buyer);
        $last = $this->write($this->producer->user);

        $conversation = $this->conversation();
        $this->assertSame($last->id, $conversation->last_message_id);
        $this->assertSame(2, $conversation->unread_by_producer);
        $this->assertSame(1, $conversation->unread_by_buyer);
    }

    public function test_opening_the_thread_clears_only_the_reader_s_side(): void
    {
        $this->write($this->buyer);
        $this->write($this->producer->user);

        $this->actingAs($this->buyer)->get(route('messages.show', $this->producer->slug))->assertOk();
        $this->assertSame([1, 0], [$this->conversation()->unread_by_producer, $this->conversation()->unread_by_buyer]);

        $this->actingAs($this->producer->user)->get(route('messages.thread', [$this->producer, $this->buyer]))->assertOk();
        $this->assertSame([0, 0], [$this->conversation()->unread_by_producer, $this->conversation()->unread_by_buyer]);
    }

    public function test_the_inbox_and_the_badge_read_the_counters(): void
    {
        $this->write($this->buyer, 'Imate li sira?');
        $this->write($this->buyer, 'I kajmaka?');

        $this->actingAs($this->producer->user)->get(route('messages.index'))->assertInertia(fn ($page) => $page
            ->where('threads.data.0.unread', 2)
            ->where('threads.data.0.last_message', 'I kajmaka?')
            ->where('unreadMessages', 2));

        $this->actingAs($this->buyer)->get(route('messages.index'))->assertInertia(fn ($page) => $page
            ->where('threads.data.0.unread', 0)
            ->where('unreadMessages', 0));
    }

    public function test_working_it_out_again_from_the_messages_gives_the_same_answer(): void
    {
        $this->write($this->buyer);
        $this->write($this->producer->user);
        $this->write($this->buyer);
        $this->actingAs($this->producer->user)->get(route('messages.thread', [$this->producer, $this->buyer]));
        $this->write($this->buyer);

        $kept = $this->conversation()->only(['last_message_id', 'unread_by_producer', 'unread_by_buyer']);

        $this->artisan('messages:rebuild-conversations')->assertSuccessful();

        $this->assertSame($kept, $this->conversation()->only(['last_message_id', 'unread_by_producer', 'unread_by_buyer']));
    }

    public function test_a_message_written_as_already_read_is_nobody_s_to_read(): void
    {
        ProducerMessage::create(['producer_id' => $this->producer->id, 'buyer_id' => $this->buyer->id, 'sender_id' => $this->buyer->id, 'body' => 'Stara poruka', 'read_at' => now()]);

        $this->assertSame([0, 0], [$this->conversation()->unread_by_producer, $this->conversation()->unread_by_buyer]);
    }
}
