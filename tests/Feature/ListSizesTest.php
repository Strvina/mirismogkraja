<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/** No page grows with the size of the site. */
class ListSizesTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_busy_producers_inbox_comes_a_page_at_a_time_newest_first(): void
    {
        $producer = Producer::factory()->active()->create();
        $buyers = User::factory()->count(31)->create();

        foreach ($buyers as $buyer) {
            ProducerMessage::create(['household_id' => $producer->id, 'buyer_id' => $buyer->id, 'sender_id' => $buyer->id, 'body' => "Od {$buyer->id}"]);
        }

        $this->actingAs($producer->user)->get('/poruke')->assertInertia(fn ($page) => $page
            ->has('threads.data', 30)
            ->where('threads.total', 31)
            ->where('threads.data.0.last_message', "Od {$buyers->last()->id}"));

        $this->actingAs($producer->user)->get('/poruke?page=2')->assertInertia(fn ($page) => $page
            ->has('threads.data', 1)
            ->where('threads.data.0.last_message', "Od {$buyers->first()->id}"));
    }

    public function test_a_producer_page_shows_the_newest_products_and_links_to_the_rest(): void
    {
        $producer = Producer::factory()->active()->create();
        Product::factory()->count(30)->for($producer)->for(Category::factory()->create())
            ->sequence(fn ($sequence) => ['name' => "Proizvod {$sequence->index}", 'slug' => "proizvod-{$sequence->index}", 'status' => 'active'])
            ->create();

        $this->get(route('marketplace.producers.show', $producer->slug))->assertInertia(fn ($page) => $page
            ->has('products', 24)
            ->where('productsCount', 30));
    }

    public function test_pages_past_the_last_readable_one_are_not_served(): void
    {
        $this->get('/proizvodi?page=501')->assertNotFound();
        $this->get('/proizvodjaci?page=501')->assertNotFound();
        $this->get('/proizvodi?page=500')->assertOk();
    }

    public function test_the_filter_choices_are_worked_out_once_for_everyone(): void
    {
        Product::factory()->for(Producer::factory()->active())->create(['status' => 'active', 'price' => 250]);

        $this->get('/proizvodi')->assertInertia(fn ($page) => $page->where('priceBounds.max', 250));
        $this->assertTrue(Cache::has('catalog:filter-choices'));
    }
}
