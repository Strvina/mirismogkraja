<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** A producer refusing messages from one buyer (task 21). */
class ConversationBlockTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_blocked_buyer_can_read_the_thread_but_not_write(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $product = Product::factory()->for($producer)->create();

        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Zdravo']);
        $this->actingAs($producer->user)->patch(route('messages.block', [$producer->id, $buyer->id]))->assertRedirect();

        $this->actingAs($buyer)->get(route('messages.show', $producer->slug))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('blocked', true));
        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Opet ja'])->assertForbidden();
        $this->actingAs($buyer)->post(route('inquiries.store', $product->slug), ['body' => 'Preko proizvoda'])->assertForbidden();

        // The producer can still answer, and can lift it.
        $this->actingAs($producer->user)->post(route('messages.thread.store', [$producer->id, $buyer->id]), ['body' => 'Hvala'])->assertRedirect();
        $this->actingAs($producer->user)->patch(route('messages.block', [$producer->id, $buyer->id]));
        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Ponovo'])->assertRedirect();

        $this->assertSame(3, ProducerMessage::count());
    }

    /** Nobody else's producer, and no buyer who never wrote. */
    public function test_only_the_owner_can_block_and_only_someone_who_wrote(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Zdravo']);

        $this->actingAs(User::factory()->create())->patch(route('messages.block', [$producer->id, $buyer->id]))->assertForbidden();

        $stranger = User::factory()->create();
        $this->actingAs($producer->user)->patch(route('messages.block', [$producer->id, $stranger->id]))->assertForbidden();

        $this->assertSame(0, $producer->blockedBuyers()->count());
    }
}
