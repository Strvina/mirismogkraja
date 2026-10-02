<?php

namespace Tests\Feature;

use App\Jobs\NotifyFollowersOfProduct;
use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use App\Support\Media;
use App\Support\UniqueSlug;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** What keeps the site fast as the catalogue and the audience grow. */
class ScalabilityTest extends TestCase
{
    use RefreshDatabase;

    /** One query for the slugs already taken, however many there are. */
    public function test_a_unique_slug_takes_one_query(): void
    {
        $producer = Producer::factory()->active()->create();
        foreach (['domaci-ajvar', 'domaci-ajvar-1', 'domaci-ajvar-2', 'domaci-ajvar-ljuti'] as $slug) {
            Product::factory()->for($producer)->create(['slug' => $slug]);
        }

        DB::enableQueryLog();
        $slug = UniqueSlug::for(Product::class, 'Domaći ajvar');

        $this->assertSame('domaci-ajvar-3', $slug);
        $this->assertCount(1, DB::getQueryLog());
        $this->assertSame('novi-sir', UniqueSlug::for(Product::class, 'Novi sir'));
    }

    /** Stored on the media disk; deleting removes the small copy too. */
    public function test_images_and_their_small_copies_go_together(): void
    {
        Storage::fake('public');

        $path = Media::store($this->fakeImage('ajvar.jpg'), 'products');
        Storage::disk('public')->assertExists($path);

        Storage::disk('public')->put(Media::thumbPath($path), 'small copy');
        Media::delete($path);

        Storage::disk('public')->assertMissing($path);
        Storage::disk('public')->assertMissing(Media::thumbPath($path));
        $this->assertSame('/storage', Media::baseUrl());
    }

    /** A draft becoming public is news to followers - once. */
    public function test_followers_hear_when_a_draft_is_published_later(): void
    {
        $follower = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $producer->followers()->attach($follower);
        $product = Product::factory()->for($producer)->create(['status' => 'draft']);

        $update = fn (string $status) => $this->actingAs($producer->user)->put(route('producers.products.update', [$producer, $product]), [
            'category_id' => $product->category_id ?? Category::factory()->create()->id,
            'name' => $product->name,
            'price' => 100,
            'unit' => 'kg',
            'stock_quantity' => 1,
            'status' => $status,
        ]);

        // Counted where it is dispatched: in the test suite one app serves
        // every request, so a job queued "after the response" of the first
        // would run again at the end of the second.
        Bus::fake();

        $update('active');
        $update('active');

        Bus::assertDispatchedAfterResponseTimes(NotifyFollowersOfProduct::class, 1);

        // And the job itself reaches the follower.
        (new NotifyFollowersOfProduct($product->fresh()))->handle();
        $this->assertSame(1, $follower->notifications()->count());
    }

    /** The ranking is kept for a while; the cards are read fresh. */
    public function test_the_home_page_ranking_is_cached_but_hidden_producers_drop_out(): void
    {
        $producer = Producer::factory()->active()->create();
        $producer->favorites()->create(['user_id' => User::factory()->create()->id]);

        $this->get('/')->assertInertia(fn ($page) => $page->has('popularProducers', 1));
        $this->assertTrue(Cache::has('home:popular-producers'));

        $producer->update(['status' => 'blocked']);

        $this->get('/')->assertInertia(fn ($page) => $page->has('popularProducers', 0));
    }
}
