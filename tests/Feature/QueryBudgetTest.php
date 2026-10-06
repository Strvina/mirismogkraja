<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Review;
use App\Models\User;
use App\Models\WantedAd;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Tests\TestCase;

/**
 * What a page costs the database must not depend on how much it shows: ten
 * producers on a list are read with the same queries as two. A list that
 * asks once per row works on a developer's machine and falls over with the
 * first hundred producers.
 */
class QueryBudgetTest extends TestCase
{
    use RefreshDatabase;

    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(now()->setDate(2026, 10, 5));
        $this->category = Category::factory()->create(['name' => 'Med', 'slug' => 'med']);
    }

    /** Producers in one town, each with products, photos, a review, a story and a buyer looking for something. */
    private function populate(int $producers): void
    {
        foreach (range(1, $producers) as $each) {
            $producer = Producer::factory()->active()->create(['city' => 'Niš', 'lat' => 43.32, 'lng' => 21.9]);

            foreach ([[null, null], [9, 11]] as [$from, $to]) {
                $product = Product::factory()->for($producer)->create([
                    'category_id' => $this->category->id, 'status' => 'active', 'season_from' => $from, 'season_to' => $to, 'published_at' => now(),
                ]);
                ProductImage::factory()->for($product)->create();
            }

            $buyer = User::factory()->create();
            Review::factory()->for($producer)->for($buyer)->create(['status' => Review::STATUS_APPROVED]);
            $buyer->favorites()->create(['favoritable_type' => 'producer', 'favoritable_id' => $producer->id]);

            $post = $producer->posts()->create([
                'type' => 'story', 'title' => "Priča {$producer->id}", 'slug' => "prica-{$producer->id}", 'body' => 'Tekst.', 'status' => 'published',
            ]);
            $post->forceFill(['published_at' => now()])->save();

            $buyer->wantedAds()->create([
                'title' => 'Tražim med', 'body' => 'Treba mi deset kilograma.', 'category_id' => $this->category->id, 'city' => 'Niš',
                'status' => WantedAd::STATUS_OPEN, 'expires_at' => now()->addDays(30),
            ]);
        }
    }

    /** @return list<string> The SQL a visit to the page runs. */
    private function queriesFor(string $url, bool $cold = true): array
    {
        if ($cold) {
            Cache::flush();
        }

        DB::flushQueryLog();
        DB::enableQueryLog();

        $this->get($url)->assertOk();

        DB::disableQueryLog();

        return array_column(DB::getQueryLog(), 'query');
    }

    public function test_a_list_runs_the_same_queries_for_ten_rows_as_for_two(): void
    {
        $pages = ['/', '/proizvodjaci', '/proizvodi', '/kategorija/med', '/mesto/nis', '/mesto/nis/med', '/sezona/oktobar', '/price', '/trazim', '/sitemap-pages.xml'];

        $this->populate(2);
        $few = array_map(fn (string $url) => count($this->queriesFor($url)), array_combine($pages, $pages));

        $this->populate(8);
        $many = array_map(fn (string $url) => count($this->queriesFor($url)), array_combine($pages, $pages));

        $this->assertSame($few, $many);

        // And none of them is expensive to begin with.
        foreach ($many as $url => $count) {
            $this->assertLessThanOrEqual(25, $count, "{$url} runs {$count} queries");
        }
    }

    public function test_a_producers_page_and_products_do_not_grow_with_what_the_producer_has(): void
    {
        $this->populate(1);
        $producer = Producer::first();
        $product = $producer->products()->first();
        $pages = [route('marketplace.producers.show', $producer->slug), route('marketplace.catalog', $producer->slug), route('marketplace.products.show', $product->slug)];

        $few = array_map(fn (string $url) => count($this->queriesFor($url)), $pages);

        foreach (range(1, 6) as $each) {
            ProductImage::factory()->for(Product::factory()->for($producer)->create(['category_id' => $this->category->id, 'status' => 'active']))->create();
            Review::factory()->for($producer)->create(['status' => Review::STATUS_APPROVED]);
        }

        $this->assertSame($few, array_map(fn (string $url) => count($this->queriesFor($url)), $pages));
    }

    /** The response-time badge is worked out from messages - once, not on every view. */
    public function test_a_producers_messages_are_not_reread_on_every_view(): void
    {
        $this->populate(1);
        $producer = Producer::first();
        $product = $producer->products()->first();
        $buyer = User::factory()->create();
        // One unanswered message: too little for a badge, which is the case that used to be recomputed.
        ProducerMessage::create(['producer_id' => $producer->id, 'buyer_id' => $buyer->id, 'sender_id' => $buyer->id, 'body' => 'Zdravo']);

        $readsMessages = fn (array $queries) => collect($queries)->contains(fn (string $sql) => str_contains($sql, 'from "producer_messages"') || str_contains($sql, 'from `producer_messages`'));

        $this->assertTrue($readsMessages($this->queriesFor(route('marketplace.producers.show', $producer->slug))));

        // Later views, of the page and of the product, with the cache left alone.
        foreach ([route('marketplace.producers.show', $producer->slug), route('marketplace.products.show', $product->slug)] as $url) {
            $this->assertFalse($readsMessages($this->queriesFor($url, cold: false)), "{$url} read the messages again");
        }
    }

    /**
     * The header re-checks its badges every half minute from whatever page
     * is open. That request must cost the two counts, not the whole page.
     */
    public function test_the_badge_poll_does_not_rebuild_the_page_it_is_sent_from(): void
    {
        $this->populate(2);
        $producer = Producer::first();
        $reader = User::factory()->create();
        ProducerMessage::create(['producer_id' => $producer->id, 'buyer_id' => $reader->id, 'sender_id' => $producer->user_id, 'body' => 'Imamo.']);

        $poll = fn (string $url, string $component, string $only = 'unreadMessages,unreadNotifications') => $this->actingAs($reader)->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => Inertia::getVersion(),
            'X-Inertia-Partial-Component' => $component,
            'X-Inertia-Partial-Data' => $only,
        ])->get($url);

        // A first, ordinary visit: the page the poll is later sent from.
        $this->actingAs($reader)->get('/')->assertOk();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $response = $poll('/', 'welcome');
        DB::disableQueryLog();
        $queries = array_column(DB::getQueryLog(), 'query');

        $response->assertOk()
            ->assertJsonPath('component', 'welcome')
            ->assertJsonPath('props.unreadMessages', 1)
            ->assertJsonPath('props.unreadNotifications', 0)
            ->assertJsonMissingPath('props.newProducers');
        // The session's user, their producers for the seller-side count, and the counts.
        $this->assertLessThanOrEqual(6, count($queries), implode("\n", $queries));

        // The same from a page with far more behind it.
        $poll(route('marketplace.producers.show', $producer->slug), 'marketplace/producers/show')
            ->assertOk()
            ->assertJsonPath('props.unreadMessages', 1)
            ->assertJsonMissingPath('props.producer');

        // Anything of the page's own asked for alongside, and the page is built as before.
        $poll('/', 'welcome', 'unreadMessages,newProducers')->assertOk()->assertJsonCount(2, 'props.newProducers');

        // A plain visit is never short-circuited.
        $this->flushHeaders();
        $this->actingAs($reader)->get('/')->assertInertia(fn ($page) => $page->has('newProducers', 2)->where('unreadMessages', 1));
    }
}
