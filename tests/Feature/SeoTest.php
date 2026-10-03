<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Services\ProductService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** What search engines and link previews read in the first HTML response. */
class SeoTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_home_page_and_the_lists_have_server_rendered_meta_with_a_preview_image(): void
    {
        foreach (['/', '/proizvodi', '/proizvodjaci'] as $url) {
            $this->get($url)->assertOk()
                ->assertSee('<meta property="og:title"', false)
                ->assertSee('images/og-default.jpg', false)
                ->assertSee('<meta name="description"', false);
        }

        $this->get('/')->assertSee('<title inertia>Vrelina juga | Domaći proizvođači sa juga Srbije</title>', false);
    }

    public function test_page_two_has_its_own_canonical_address_and_filters_do_not(): void
    {
        $this->get('/proizvodi?page=2&sort=price_asc')->assertSee('<link rel="canonical" href="'.url('/proizvodi').'?page=2">', false);
        $this->get('/proizvodi?sort=price_asc')->assertSee('<link rel="canonical" href="'.url('/proizvodi').'">', false);
    }

    public function test_a_category_has_its_own_indexable_page(): void
    {
        $honey = Category::factory()->create(['name' => 'Med', 'slug' => 'med']);
        $other = Category::factory()->create();
        $producer = Producer::factory()->active()->create();
        Product::factory()->for($producer)->create(['category_id' => $honey->id, 'status' => 'active']);
        Product::factory()->for($producer)->create(['category_id' => $other->id, 'status' => 'active']);

        $this->get('/kategorija/med')->assertOk()
            ->assertSee('<title inertia>Med | Vrelina juga</title>', false)
            ->assertInertia(fn ($page) => $page->where('category.slug', 'med')->has('products.data', 1));

        $this->get(route('sitemap.pages'))->assertSee(route('marketplace.categories.show', 'med'), false);
        $this->get('/kategorija/nema-je')->assertNotFound();
    }

    public function test_a_renamed_product_or_producer_redirects_from_its_old_address(): void
    {
        $producer = Producer::factory()->active()->create(['name' => 'Pčelarstvo Jovanović', 'slug' => 'pcelarstvo-jovanovic']);
        $product = Product::factory()->for($producer)->create(['name' => 'Med', 'slug' => 'med', 'status' => 'active']);

        app(ProductService::class)->update($product, ['name' => 'Bagremov med']);
        $producer->update(['slug' => 'pcelarstvo-jovanovic-nis']);

        $this->get('/proizvod/med?utm=viber')->assertStatus(301)->assertRedirect(url('/proizvod/bagremov-med?utm=viber'));
        $this->get('/proizvodjac/pcelarstvo-jovanovic')->assertStatus(301)->assertRedirect(url('/proizvodjac/pcelarstvo-jovanovic-nis'));

        // Renamed twice: the first address still lands on the current one.
        app(ProductService::class)->update($product->fresh(), ['name' => 'Bagremov med 2026']);
        $this->get('/proizvod/med')->assertRedirect(url('/proizvod/bagremov-med-2026'));

        // A form posted to an old address is not silently turned into a GET.
        $this->actingAs(User::factory()->create())->post('/proizvod/med/upit', ['body' => 'Zdravo'])->assertNotFound();
    }

    public function test_a_producer_page_describes_itself_as_a_local_business(): void
    {
        $producer = Producer::factory()->active()->create(['city' => 'Leskovac', 'lat' => 42.99, 'lng' => 21.94]);
        Review::create(['user_id' => User::factory()->create()->id, 'household_id' => $producer->id, 'rating' => 4, 'status' => Review::STATUS_APPROVED]);

        $this->get(route('marketplace.producers.show', $producer->slug))->assertOk()
            ->assertSee('"@type":"LocalBusiness"', false)
            ->assertSee('"addressLocality":"Leskovac"', false)
            ->assertSee('"reviewCount":1', false);
    }

    public function test_the_preview_locale_follows_the_language(): void
    {
        $this->withHeader('Accept-Language', 'ru')->get('/')->assertSee('content="ru_RU"', false);
    }
}
