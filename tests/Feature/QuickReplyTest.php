<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\QuickReply;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuickReplyTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_producer_saves_edits_and_deletes_answers(): void
    {
        $producer = Producer::factory()->active()->create();
        $this->actingAs($producer->user);

        $this->post(route('producers.quick-replies.store', $producer), ['title' => 'Dostava', 'body' => 'Šaljemo kurirom, {ime}.'])
            ->assertSessionHasNoErrors();

        $reply = $producer->quickReplies()->sole();

        $this->get(route('producers.quick-replies.index', $producer))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('producers/quick-replies')->where('replies.0.title', 'Dostava'));

        $this->put(route('producers.quick-replies.update', [$producer, $reply]), ['title' => 'Slanje', 'body' => 'Šaljemo poštom.'])
            ->assertSessionHasNoErrors();
        $this->assertSame('Slanje', $reply->refresh()->title);

        $this->delete(route('producers.quick-replies.destroy', [$producer, $reply]))->assertRedirect();
        $this->assertDatabaseCount('quick_replies', 0);
    }

    public function test_answers_are_validated_and_capped(): void
    {
        $producer = Producer::factory()->active()->create();
        $this->actingAs($producer->user);

        $this->post(route('producers.quick-replies.store', $producer), ['title' => '', 'body' => ''])->assertSessionHasErrors(['title', 'body']);
        $this->post(route('producers.quick-replies.store', $producer), ['title' => 'Dugačak', 'body' => str_repeat('a', QuickReply::BODY_MAX + 1)])
            ->assertSessionHasErrors('body');

        foreach (range(1, QuickReply::MAX_PER_PRODUCER) as $number) {
            $producer->quickReplies()->create(['title' => "Odgovor {$number}", 'body' => 'Tekst']);
        }

        $this->post(route('producers.quick-replies.store', $producer), ['title' => 'Još jedan', 'body' => 'Tekst'])->assertSessionHasErrors('title');
        $this->assertDatabaseCount('quick_replies', QuickReply::MAX_PER_PRODUCER);
    }

    public function test_nobody_else_reads_or_changes_them(): void
    {
        $producer = Producer::factory()->active()->create();
        $reply = $producer->quickReplies()->create(['title' => 'Cene', 'body' => 'Med 900 RSD.']);
        $other = Producer::factory()->active()->create();

        $this->actingAs($other->user);

        $this->get(route('producers.quick-replies.index', $producer))->assertForbidden();
        $this->post(route('producers.quick-replies.store', $producer), ['title' => 'Tuđ', 'body' => 'Tekst'])->assertForbidden();
        $this->post(route('producers.quick-replies.starters', $producer))->assertForbidden();
        $this->put(route('producers.quick-replies.update', [$producer, $reply]), ['title' => 'Tuđ', 'body' => 'Tekst'])->assertForbidden();
        $this->delete(route('producers.quick-replies.destroy', [$producer, $reply]))->assertForbidden();

        // Nor through a producer of their own.
        $this->put(route('producers.quick-replies.update', [$other, $reply]), ['title' => 'Tuđ', 'body' => 'Tekst'])->assertNotFound();
        $this->delete(route('producers.quick-replies.destroy', [$other, $reply]))->assertNotFound();

        $this->assertSame('Cene', $reply->refresh()->title);
    }

    public function test_the_suggested_answers_fill_an_empty_list_once(): void
    {
        $producer = Producer::factory()->active()->create();
        $this->actingAs($producer->user);

        $this->post(route('producers.quick-replies.starters', $producer))->assertRedirect();
        $this->post(route('producers.quick-replies.starters', $producer))->assertRedirect();

        $this->assertSame(count(QuickReply::STARTERS), $producer->quickReplies()->count());
    }

    public function test_only_the_producers_side_of_a_thread_gets_the_answers(): void
    {
        $producer = Producer::factory()->active()->create();
        $producer->quickReplies()->create(['title' => 'Cene', 'body' => 'Med 900 RSD.']);
        $buyer = User::factory()->create();
        ProducerMessage::create(['producer_id' => $producer->id, 'buyer_id' => $buyer->id, 'sender_id' => $buyer->id, 'body' => 'Pošto je med?']);

        $this->actingAs($producer->user)->get(route('messages.thread', [$producer, $buyer]))
            ->assertInertia(fn ($page) => $page->has('quickReplies', 1)->where('quickReplies.0.body', 'Med 900 RSD.'));

        $this->actingAs($buyer)->get(route('messages.show', $producer->slug))
            ->assertInertia(fn ($page) => $page->where('quickReplies', []));
    }
}
