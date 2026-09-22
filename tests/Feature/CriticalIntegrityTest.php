<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The rules that keep the introduction model honest: a producer cannot talk
 * to themselves, rate themselves, or reach a buyer who never wrote to them.
 */
class CriticalIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_producer_cannot_open_an_inquiry_on_their_own_product(): void
    {
        $owner = User::factory()->create();
        $producer = Producer::factory()->for($owner)->active()->create();
        $product = Product::factory()->for($producer)->create(['status' => 'active']);

        $this->actingAs($owner)
            ->post(route('inquiries.store', $product->slug), ['body' => 'Pitanje samom sebi'])
            ->assertForbidden();

        $this->assertSame(0, ProducerMessage::count());
    }

    public function test_an_inquiry_cannot_be_opened_on_a_hidden_product(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $product = Product::factory()->for($producer)->create(['status' => 'draft']);

        $this->actingAs($buyer)
            ->post(route('inquiries.store', $product->slug), ['body' => 'Da li je dostupno?'])
            ->assertNotFound();
    }

    public function test_an_inquiry_records_the_product_it_was_opened_from(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $product = Product::factory()->for($producer)->create(['status' => 'active']);

        $this->actingAs($buyer)
            ->post(route('inquiries.store', $product->slug), ['body' => 'Koliko imate na stanju?'])
            ->assertRedirect(route('messages.show', $producer->slug));

        $this->assertDatabaseHas('producer_messages', [
            'household_id' => $producer->id,
            'product_id' => $product->id,
            'buyer_id' => $buyer->id,
            'sender_id' => $buyer->id,
        ]);
    }

    public function test_a_producer_cannot_review_themselves(): void
    {
        $owner = User::factory()->create();
        $producer = Producer::factory()->for($owner)->active()->create();

        ProducerMessage::create([
            'household_id' => $producer->id,
            'buyer_id' => $owner->id,
            'sender_id' => $owner->id,
            'body' => 'Poruka',
        ]);

        $this->assertFalse($owner->can('create', [Review::class, $producer]));
        $this->actingAs($owner)->post(route('reviews.store', $producer), ['rating' => 5])->assertForbidden();
    }

    public function test_a_producer_cannot_start_an_unsolicited_thread_with_a_buyer(): void
    {
        $owner = User::factory()->create();
        $buyer = User::factory()->create();
        $producer = Producer::factory()->for($owner)->active()->create();

        $this->actingAs($owner)
            ->post(route('messages.thread.store', [$producer, $buyer]), ['body' => 'Neželjena poruka'])
            ->assertForbidden();

        $this->assertSame(0, ProducerMessage::thread($producer, $buyer)->count());
    }
}
