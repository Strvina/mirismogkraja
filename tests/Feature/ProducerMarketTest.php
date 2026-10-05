<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMarket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProducerMarketTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, mixed> */
    private function market(array $overrides = []): array
    {
        return [
            'name' => 'Zelena pijaca Tvrđava',
            'city' => 'Niš',
            'days' => [7, 6],
            'opens_at' => '07:00',
            'closes_at' => '13:00',
            'note' => 'Tezga 14',
            ...$overrides,
        ];
    }

    public function test_the_owner_adds_a_market_and_the_public_page_shows_it(): void
    {
        $producer = Producer::factory()->active()->create();

        $this->actingAs($producer->user)
            ->post(route('producers.markets.store', $producer), $this->market())
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->actingAs($producer->user)->get(route('producers.markets.index', $producer))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('producers/markets')->has('markets', 1));

        $this->get(route('marketplace.producers.show', $producer->slug))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('markets', 1)
                ->where('markets.0.name', 'Zelena pijaca Tvrđava')
                // Stored in week order, whatever order they were ticked in.
                ->where('markets.0.days', [6, 7])
                ->where('markets.0.opens_at', '07:00')
                ->where('markets.0.closes_at', '13:00'));
    }

    public function test_only_the_owner_manages_a_producers_markets(): void
    {
        $producer = Producer::factory()->active()->create();
        $market = $producer->markets()->create($this->market());
        $stranger = User::factory()->create();

        $this->actingAs($stranger)->get(route('producers.markets.index', $producer))->assertForbidden();
        $this->actingAs($stranger)->post(route('producers.markets.store', $producer), $this->market())->assertForbidden();
        $this->actingAs($stranger)->put(route('producers.markets.update', [$producer, $market]), $this->market())->assertForbidden();
        $this->actingAs($stranger)->delete(route('producers.markets.destroy', [$producer, $market]))->assertForbidden();

        $this->assertDatabaseCount('producer_markets', 1);
    }

    public function test_a_market_cannot_be_reached_through_another_producer(): void
    {
        $producer = Producer::factory()->active()->create();
        $other = Producer::factory()->active()->create();
        $market = $other->markets()->create($this->market());

        $this->actingAs($producer->user)
            ->put(route('producers.markets.update', [$producer, $market]), $this->market(['name' => 'Tuđe']))
            ->assertNotFound();
        $this->actingAs($producer->user)->delete(route('producers.markets.destroy', [$producer, $market]))->assertNotFound();

        $this->assertSame('Zelena pijaca Tvrđava', $market->refresh()->name);
    }

    public function test_days_and_hours_are_validated(): void
    {
        $producer = Producer::factory()->active()->create();
        $this->actingAs($producer->user);

        $this->post(route('producers.markets.store', $producer), $this->market(['days' => []]))->assertSessionHasErrors('days');
        $this->post(route('producers.markets.store', $producer), $this->market(['days' => [0, 8]]))->assertSessionHasErrors(['days.0', 'days.1']);
        $this->post(route('producers.markets.store', $producer), $this->market(['days' => [1, 1]]))->assertSessionHasErrors('days.0');
        $this->post(route('producers.markets.store', $producer), $this->market(['closes_at' => '06:00']))->assertSessionHasErrors('closes_at');
        $this->post(route('producers.markets.store', $producer), $this->market(['closes_at' => null]))->assertSessionHasErrors('closes_at');
        $this->post(route('producers.markets.store', $producer), $this->market(['opens_at' => '7 ujutru']))->assertSessionHasErrors('opens_at');

        $this->assertDatabaseCount('producer_markets', 0);
    }

    public function test_the_list_has_a_ceiling(): void
    {
        $producer = Producer::factory()->active()->create();

        foreach (range(1, ProducerMarket::MAX_PER_PRODUCER) as $number) {
            $producer->markets()->create($this->market(['name' => "Pijaca {$number}"]));
        }

        $this->actingAs($producer->user)
            ->post(route('producers.markets.store', $producer), $this->market())
            ->assertSessionHasErrors('name');

        $this->assertDatabaseCount('producer_markets', ProducerMarket::MAX_PER_PRODUCER);
    }

    public function test_the_owner_edits_and_removes_a_market(): void
    {
        $producer = Producer::factory()->active()->create();
        $market = $producer->markets()->create($this->market());

        $this->actingAs($producer->user)
            ->put(route('producers.markets.update', [$producer, $market]), $this->market(['name' => 'Kalča', 'opens_at' => null, 'closes_at' => null]))
            ->assertSessionHasNoErrors();

        $this->assertSame('Kalča', $market->refresh()->name);
        $this->assertNull($market->opens_at);

        $this->actingAs($producer->user)->delete(route('producers.markets.destroy', [$producer, $market]))->assertRedirect();
        $this->assertDatabaseCount('producer_markets', 0);
    }
}
