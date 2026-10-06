<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Services\SeasonCalendar;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * "Šta je sada u sezoni": a page per month, and a row on the home page for
 * the month we are in.
 */
class SeasonPagesTest extends TestCase
{
    use RefreshDatabase;

    private function product(string $name, ?int $from, ?int $to, array $attributes = []): Product
    {
        return Product::factory()
            ->for(Producer::factory()->active()->create())
            ->for(Category::factory()->create())
            ->create(['name' => $name, 'status' => 'active', 'season_from' => $from, 'season_to' => $to, ...$attributes]);
    }

    public function test_a_month_lists_only_products_whose_own_season_covers_it(): void
    {
        $this->product('Med', null, null);            // all year: not "in season"
        $this->product('Kupine', 6, 8);
        $this->product('Kiseli kupus', 11, 2);        // wraps the new year
        $this->product('Ajvar', 9, 11);
        $this->product('Skriveno', 9, 11, ['status' => 'draft']);

        $this->get('/sezona/oktobar')
            ->assertOk()
            ->assertSee('<title inertia>U sezoni: oktobar | Vrelina juga</title>', false)
            ->assertSee('<link rel="canonical" href="'.url('/sezona/oktobar').'">', false)
            ->assertInertia(fn ($page) => $page
                ->component('marketplace/season')
                ->where('month', 10)
                ->has('months', 12)
                ->has('products.data', 1)
                ->where('products.data.0.name', 'Ajvar')
                ->where('months.9.has_products', true)
                // April: nothing has its season then.
                ->where('months.3.has_products', false));

        $this->get('/sezona/januar')->assertInertia(fn ($page) => $page
            ->has('products.data', 1)
            ->where('products.data.0.name', 'Kiseli kupus'));

        $this->assertSame([1, 2, 6, 7, 8, 9, 10, 11, 12], app(SeasonCalendar::class)->monthsWithProducts());
    }

    public function test_the_season_address_leads_to_this_month(): void
    {
        $this->travelTo(now()->setDate(2026, 7, 15));

        $this->get('/sezona')->assertRedirect(url('/sezona/jul'));
        $this->get('/sezona/jul')->assertInertia(fn ($page) => $page->where('isCurrent', true)->has('products.data', 0));
        $this->get('/sezona/avgust')->assertInertia(fn ($page) => $page->where('isCurrent', false));

        $this->get('/sezona/thermidor')->assertNotFound();
    }

    public function test_the_month_is_named_in_the_readers_language(): void
    {
        $this->withHeader('Accept-Language', 'en')->get('/sezona/oktobar')
            ->assertSee('<title inertia>In season: October | Vrelina juga</title>', false);
    }

    public function test_the_home_page_shows_what_is_in_season_now(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 5));

        $this->product('Med', null, null);
        $this->product('Kupine', 6, 8);
        $ajvar = $this->product('Ajvar', 9, 11);

        $this->get('/')->assertInertia(fn ($page) => $page
            ->where('seasonMonth', 10)
            ->has('seasonalProducts', 1)
            ->where('seasonalProducts.0.id', $ajvar->id));
    }

    public function test_only_months_with_something_in_season_are_in_the_sitemap(): void
    {
        $this->product('Kupine', 6, 7);

        $this->get(route('sitemap.pages'))
            ->assertSee(url('/sezona/jun'), false)
            ->assertSee(url('/sezona/jul'), false)
            ->assertDontSee(url('/sezona/avgust'), false);
    }
}
