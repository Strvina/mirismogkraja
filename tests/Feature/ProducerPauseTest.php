<?php

namespace Tests\Feature;

use App\Http\Middleware\ThrottlePerRoute;
use App\Jobs\NotifyFollowersOfResume;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\User;
use App\Services\ProducerPause;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

/**
 * A producer's pause: the page stays online, new conversations wait, and
 * the followers hear when it is over.
 */
class ProducerPauseTest extends TestCase
{
    use RefreshDatabase;

    private Producer $producer;

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ThrottlePerRoute::class);
        $this->producer = Producer::factory()->active()->create();
        $this->product = Product::factory()->for($this->producer)->create(['status' => 'active']);
    }

    private function pause(array $form = []): void
    {
        $this->actingAs($this->producer->user)
            ->put(route('producers.pause.update', $this->producer), ['paused' => true, ...$form])
            ->assertSessionHasNoErrors();
        $this->producer->refresh();
    }

    public function test_the_owner_turns_a_pause_on_with_a_date_and_a_note(): void
    {
        $until = today()->addDays(10)->toDateString();
        $this->pause(['until' => $until, 'note' => 'Rasprodato do nove berbe.']);

        $this->assertTrue($this->producer->isPaused());
        $this->assertSame(['until' => $until, 'note' => 'Rasprodato do nove berbe.'], $this->producer->pauseForVisitors());

        $this->actingAs($this->producer->user)->get(route('producers.pause.edit', $this->producer))->assertInertia(fn ($page) => $page
            ->component('producers/pause')
            ->where('pause.paused', true)
            ->where('pause.until', $until));
        $this->actingAs($this->producer->user)->get(route('producers.index'))
            ->assertInertia(fn ($page) => $page->where('producers.0.is_paused', true));

        // Changing the note does not restart the pause.
        $since = $this->producer->paused_at;
        $this->travel(2)->days();
        $this->pause(['note' => 'Vraćamo se uskoro.']);
        $this->assertTrue($this->producer->paused_at->equalTo($since));
        $this->assertNull($this->producer->paused_until);
    }

    public function test_only_the_owner_can_pause_and_the_date_has_to_make_sense(): void
    {
        $stranger = User::factory()->create();

        $this->actingAs($stranger)->get(route('producers.pause.edit', $this->producer))->assertForbidden();
        $this->actingAs($stranger)->put(route('producers.pause.update', $this->producer), ['paused' => true])->assertForbidden();

        $this->actingAs($this->producer->user)
            ->put(route('producers.pause.update', $this->producer), ['paused' => true, 'until' => today()->subDay()->toDateString()])
            ->assertSessionHasErrors('until');
        $this->actingAs($this->producer->user)
            ->put(route('producers.pause.update', $this->producer), ['paused' => true, 'until' => today()->addYears(2)->toDateString()])
            ->assertSessionHasErrors('until');

        $this->assertFalse($this->producer->refresh()->isPaused());
    }

    public function test_a_paused_producer_stays_public_but_takes_no_new_inquiries(): void
    {
        $buyer = User::factory()->create();
        $this->pause(['note' => 'Na odmoru.']);

        $this->actingAs($buyer)->get(route('marketplace.producers.show', $this->producer->slug))->assertOk()
            ->assertInertia(fn ($page) => $page->where('pause.note', 'Na odmoru.')->where('canMessage', false)->where('canFollow', true));
        $this->actingAs($buyer)->get(route('marketplace.products.show', $this->product->slug))->assertOk()
            ->assertInertia(fn ($page) => $page->where('pause.note', 'Na odmoru.')->where('canInquire', false)->where('canFollow', true));
        // The price list is what gets sent around in chats: it says so too.
        $this->get(route('marketplace.catalog', $this->producer->slug))->assertOk()
            ->assertInertia(fn ($page) => $page->where('pause.note', 'Na odmoru.'));
        $this->get(route('marketplace.products.index'))->assertInertia(fn ($page) => $page->has('products.data', 1));

        // A form left open from before the pause.
        $this->actingAs($buyer)->post(route('inquiries.store', $this->product->slug), ['body' => 'Imate li još?'])
            ->assertSessionHasErrors('body');
        $this->actingAs($buyer)->post(route('messages.store', $this->producer->slug), ['body' => 'Zdravo'])
            ->assertSessionHasErrors('body');
        $this->assertSame(0, ProducerMessage::count());
    }

    public function test_a_conversation_already_open_carries_on_through_a_pause(): void
    {
        $buyer = User::factory()->create();
        $this->actingAs($buyer)->post(route('inquiries.store', $this->product->slug), ['body' => 'Koliko košta dostava?']);

        $this->pause();

        $this->actingAs($buyer)->get(route('marketplace.products.show', $this->product->slug))
            ->assertInertia(fn ($page) => $page->where('canInquire', true));
        $this->actingAs($buyer)->post(route('messages.store', $this->producer->slug), ['body' => 'Javite kad stignete.'])
            ->assertSessionHasNoErrors();
        $this->actingAs($this->producer->user)
            ->post(route('messages.thread.store', [$this->producer, $buyer]), ['body' => 'Hoću, hvala.'])
            ->assertSessionHasNoErrors();

        $this->assertSame(3, ProducerMessage::count());
    }

    public function test_turning_the_pause_off_tells_the_followers(): void
    {
        $follower = User::factory()->create();
        $follower->followedProducers()->attach($this->producer);
        $this->pause();

        Bus::fake([NotifyFollowersOfResume::class]);
        $this->actingAs($this->producer->user)->put(route('producers.pause.update', $this->producer), ['paused' => false])
            ->assertSessionHasNoErrors();
        Bus::assertDispatchedAfterResponse(NotifyFollowersOfResume::class);

        $this->assertFalse($this->producer->refresh()->isPaused());

        (new NotifyFollowersOfResume($this->producer))->handle();
        $this->assertSame('producer.resumed', $follower->notifications()->sole()->data['type']);

        // Off when it was already off: nothing to announce.
        Bus::fake([NotifyFollowersOfResume::class]);
        $this->actingAs($this->producer->user)->put(route('producers.pause.update', $this->producer), ['paused' => false]);
        Bus::assertNotDispatchedAfterResponse(NotifyFollowersOfResume::class);
    }

    public function test_a_pause_with_a_return_date_ends_by_itself(): void
    {
        $follower = User::factory()->create();
        $follower->followedProducers()->attach($this->producer);
        $buyer = User::factory()->create();

        $this->pause(['until' => today()->addDays(3)->toDateString()]);

        // Still away on the last day of the pause...
        $this->travelTo(today()->addDays(3)->setTime(18, 0));
        $this->assertTrue($this->producer->refresh()->isPaused());
        $this->assertSame(0, app(ProducerPause::class)->resumeDue());

        // ...and back the next morning, even before the nightly job has run.
        $this->travelTo(today()->addDay()->setTime(5, 0));
        $this->assertFalse($this->producer->refresh()->isPaused());
        $this->actingAs($buyer)->post(route('inquiries.store', $this->product->slug), ['body' => 'Imate li još?'])
            ->assertSessionHasNoErrors();

        $this->assertSame(1, app(ProducerPause::class)->resumeDue());
        $this->assertNull($this->producer->refresh()->paused_at);
        $this->assertSame('producer.resumed', $follower->notifications()->sole()->data['type']);

        // Run again the same day: nothing left to end, nobody told twice.
        $this->assertSame(0, app(ProducerPause::class)->resumeDue());
        $this->assertSame(1, $follower->notifications()->count());
    }
}
