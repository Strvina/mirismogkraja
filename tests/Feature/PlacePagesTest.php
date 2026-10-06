<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Services\Places;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A town has a page of its own (/mesto/nis), and so does a category within
 * it (/mesto/nis/med) - what a search for "domaći med Niš" should land on.
 */
class PlacePagesTest extends TestCase
{
    use RefreshDatabase;

    private Category $honey;

    private Category $cheese;

    protected function setUp(): void
    {
        parent::setUp();

        $this->honey = Category::factory()->create(['name' => 'Med', 'slug' => 'med']);
        $this->cheese = Category::factory()->create(['name' => 'Sir', 'slug' => 'sir']);
    }

    private function product(string $city, Category $category, array $attributes = []): Product
    {
        return Product::factory()
            ->for(Producer::factory()->active()->create(['city' => $city]))
            ->create(['category_id' => $category->id, 'status' => 'active', ...$attributes]);
    }

    public function test_a_place_page_lists_what_is_sold_from_there(): void
    {
        $honey = $this->product('Niš', $this->honey, ['name' => 'Bagremov med']);
        $this->product('Niš', $this->cheese, ['name' => 'Kozji sir']);
        $this->product('Leskovac', $this->honey, ['name' => 'Livadski med']);

        $this->get('/mesto/nis')
            ->assertOk()
            ->assertSee('<title inertia>Domaći proizvodi — Niš | Vrelina juga</title>', false)
            ->assertSee('<link rel="canonical" href="'.url('/mesto/nis').'">', false)
            ->assertInertia(fn ($page) => $page
                ->component('marketplace/places/show')
                ->where('place', ['slug' => 'nis', 'name' => 'Niš'])
                ->where('category', null)
                ->has('products.data', 2)
                ->has('producers', 2)
                ->has('categories', 2)
                // A card, not the whole row.
                ->missing('products.data.0.description')
                ->missing('producers.0.phone'));

        $this->get('/mesto/nis/med')
            ->assertOk()
            ->assertSee('<title inertia>Med Niš: cena i prodaja | Vrelina juga</title>', false)
            ->assertInertia(fn ($page) => $page
                ->where('category.slug', 'med')
                ->has('products.data', 1)
                ->where('products.data.0.id', $honey->id)
                ->has('producers', 0));
    }

    public function test_different_spellings_of_a_town_are_one_place(): void
    {
        $this->product('Niš', $this->honey);
        $this->product('Niš', $this->honey);
        $this->product('nis', $this->cheese);

        $place = app(Places::class)->find('nis');

        $this->assertSame('Niš', $place['name']);
        $this->assertEqualsCanonicalizing(['Niš', 'nis'], $place['spellings']);
        $this->assertSame(3, $place['products']);

        $this->get('/mesto/nis')->assertInertia(fn ($page) => $page->has('products.data', 3));
    }

    public function test_a_place_exists_only_while_something_published_is_sold_from_it(): void
    {
        $this->product('Vranje', $this->honey, ['status' => 'draft']);
        Product::factory()
            ->for(Producer::factory()->create(['city' => 'Pirot', 'status' => 'pending']))
            ->create(['category_id' => $this->honey->id, 'status' => 'active']);
        $this->product('Niš', $this->honey);

        $this->get('/mesto/vranje')->assertNotFound();
        $this->get('/mesto/pirot')->assertNotFound();
        $this->get('/mesto/nema-ga')->assertNotFound();
        // The town exists, but nobody there sells cheese.
        $this->get('/mesto/nis/sir')->assertNotFound();
        $this->get('/mesto/nis/nema-je')->assertNotFound();
    }

    public function test_place_pages_are_linked_from_the_sitemap_and_from_the_pages_around_them(): void
    {
        $product = $this->product('Niš', $this->honey);
        $elsewhere = Producer::factory()->active()->create(['city' => 'Prokuplje']);

        $this->get(route('sitemap.pages'))
            ->assertSee(url('/mesto/nis'), false)
            ->assertSee(url('/mesto/nis/med'), false)
            ->assertDontSee(url('/mesto/nis/sir'), false)
            ->assertDontSee(url('/mesto/prokuplje'), false);

        $this->get('/kategorija/med')->assertInertia(fn ($page) => $page->where('places', [['slug' => 'nis', 'name' => 'Niš']]));
        $this->get('/proizvodi')->assertInertia(fn ($page) => $page->where('places', []));

        $this->get(route('marketplace.products.show', $product->slug))->assertInertia(fn ($page) => $page->where('place.slug', 'nis'));
        $this->get(route('marketplace.producers.show', $product->producer->slug))->assertInertia(fn ($page) => $page->where('place.slug', 'nis'));
        // No products there yet, so no page to link to.
        $this->get(route('marketplace.producers.show', $elsewhere->slug))->assertInertia(fn ($page) => $page->where('place', null));
    }
}
