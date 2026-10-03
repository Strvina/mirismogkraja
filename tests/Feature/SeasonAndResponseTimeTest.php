<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\User;
use App\Services\ResponseTime;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeasonAndResponseTimeTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_in_season_filter_understands_ranges_that_wrap_the_new_year(): void
    {
        $this->travelTo(now()->setDate(2026, 1, 15));
        $producer = Producer::factory()->active()->create();
        $category = Category::factory()->create();
        $make = fn (string $name, ?int $from, ?int $to) => Product::factory()->for($producer)->for($category)
            ->create(['name' => $name, 'slug' => str($name)->slug(), 'status' => 'active', 'season_from' => $from, 'season_to' => $to]);

        $make('Med', null, null);          // all year
        $make('Kupine', 6, 8);             // summer only
        $make('Kiseli kupus', 11, 2);      // wraps the new year
        $make('Ren', 1, 1);

        $this->get('/proizvodi?in_season=1')->assertInertia(fn ($page) => $page
            ->has('products.data', 3)
            ->where('filters.in_season', '1'));

        $this->assertSame(['Kiseli kupus', 'Med', 'Ren'], Product::inSeason()->orderBy('name')->pluck('name')->all());
        $this->assertSame(['Kupine', 'Med'], Product::inSeason(7)->orderBy('name')->pluck('name')->all());
    }

    public function test_a_season_needs_both_ends(): void
    {
        $producer = Producer::factory()->active()->create();
        $form = ['category_id' => Category::factory()->create()->id, 'name' => 'Kupine', 'price' => 500, 'unit' => 'kg', 'stock_quantity' => 3, 'status' => 'active'];

        $this->actingAs($producer->user)->post(route('producers.products.store', $producer), [...$form, 'season_from' => 6])
            ->assertSessionHasErrors('season_to');

        $this->actingAs($producer->user)->post(route('producers.products.store', $producer), [...$form, 'season_from' => 6, 'season_to' => 13])
            ->assertSessionHasErrors('season_to');

        $this->actingAs($producer->user)->post(route('producers.products.store', $producer), [...$form, 'season_from' => 6, 'season_to' => 8])
            ->assertSessionHasNoErrors();
        $this->assertSame([6, 8], [Product::first()->season_from, Product::first()->season_to]);
    }

    public function test_the_usual_response_time_is_the_middle_wait_between_a_question_and_the_answer(): void
    {
        $producer = Producer::factory()->active()->create();
        $responses = app(ResponseTime::class);

        // Three buyers, answered after 1, 3 and 30 hours: the middle is 3.
        foreach ([1, 3, 30] as $hours) {
            $buyer = User::factory()->create();
            $asked = now()->subDays(5);
            $this->message($producer, $buyer, $buyer, $asked);
            // A second message while waiting does not restart the clock.
            $this->message($producer, $buyer, $buyer, $asked->copy()->addMinutes(20));
            $this->message($producer, $buyer, $producer->user, $asked->copy()->addHours($hours));
        }

        $this->assertSame(3.0, $responses->medianHours($producer));
        $this->assertSame('hours', $responses->bucketFor($producer));
        $this->get(route('marketplace.producers.show', $producer->slug))->assertInertia(fn ($page) => $page->where('responseTime', 'hours'));
    }

    public function test_too_few_answers_say_nothing(): void
    {
        $producer = Producer::factory()->active()->create();
        $buyer = User::factory()->create();
        $this->message($producer, $buyer, $buyer, now()->subDay());
        $this->message($producer, $buyer, $producer->user, now());

        $this->assertNull(app(ResponseTime::class)->bucketFor($producer));
    }

    private function message(Producer $producer, User $buyer, User $sender, $at): void
    {
        ProducerMessage::create(['producer_id' => $producer->id, 'buyer_id' => $buyer->id, 'sender_id' => $sender->id, 'body' => 'x'])
            ->forceFill(['created_at' => $at])
            ->save();
    }
}
