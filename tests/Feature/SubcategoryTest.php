<?php

namespace Tests\Feature;

use App\Jobs\NotifyProducersOfWantedAd;
use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use App\Models\WantedAd;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Categories are two levels deep: "Zimnica" and, under it, "Ajvar". The
 * narrower one has a page of its own - what a search for "domaći ajvar"
 * should land on - and the general one lists its products too.
 */
class SubcategoryTest extends TestCase
{
    use RefreshDatabase;

    private Category $preserves;

    private Category $ajvar;

    private Category $pindjur;

    protected function setUp(): void
    {
        parent::setUp();

        $this->preserves = Category::factory()->create(['name' => 'Zimnica', 'slug' => 'zimnica', 'search_name' => 'Domaća zimnica']);
        $this->ajvar = Category::factory()->create(['name' => 'Ajvar', 'slug' => 'ajvar', 'search_name' => 'Domaći ajvar', 'parent_id' => $this->preserves->id]);
        $this->pindjur = Category::factory()->create(['name' => 'Pinđur', 'slug' => 'pindjur', 'parent_id' => $this->preserves->id]);
    }

    private function product(Category $category, array $attributes = [], string $city = 'Leskovac'): Product
    {
        return Product::factory()
            ->for(Producer::factory()->active()->create(['city' => $city]))
            ->create(['category_id' => $category->id, 'status' => 'active', ...$attributes]);
    }

    public function test_a_category_lists_its_subcategories_products_with_its_own(): void
    {
        $general = $this->product($this->preserves);
        $ajvar = $this->product($this->ajvar);
        $this->product(Category::factory()->create());

        $this->get('/kategorija/zimnica')
            ->assertOk()
            ->assertSee('<title inertia>Domaća zimnica: cena i prodaja od proizvođača | Vrelina juga</title>', false)
            ->assertInertia(fn ($page) => $page
                ->has('products.data', 2)
                ->where('category.search_name', 'Domaća zimnica')
                ->where('category.parent', null)
                // Only the subcategories with something in them: no chip leads to an empty page.
                ->has('subcategories', 1)
                ->where('subcategories.0.slug', 'ajvar'));

        $this->get('/kategorija/ajvar')
            ->assertOk()
            ->assertSee('<title inertia>Domaći ajvar: cena i prodaja od proizvođača | Vrelina juga</title>', false)
            ->assertInertia(fn ($page) => $page
                ->has('products.data', 1)
                ->where('products.data.0.id', $ajvar->id)
                ->where('category.parent.slug', 'zimnica')
                // Its siblings, itself among them.
                ->has('subcategories', 1));

        // The filter on the catalogue reads a category the same way.
        $this->get('/proizvodi?category_id='.$this->preserves->id)->assertInertia(fn ($page) => $page->has('products.data', 2));
        $this->get('/proizvodi?category_id='.$this->ajvar->id)->assertInertia(fn ($page) => $page->has('products.data', 1));
        $this->assertNotSame($general->id, $ajvar->id);
    }

    public function test_breadcrumbs_lead_through_the_parent_category(): void
    {
        $product = $this->product($this->ajvar, ['name' => 'Ajvar ljuti']);

        foreach (['/kategorija/ajvar', route('marketplace.products.show', $product->slug, false)] as $address) {
            $html = $this->get($address)->assertOk()->getContent();

            $this->assertStringContainsString('"name":"Zimnica","item":"'.url('/kategorija/zimnica').'"', $html, $address);
            $this->assertStringContainsString('"name":"Ajvar","item":"'.url('/kategorija/ajvar').'"', $html, $address);
        }
    }

    public function test_an_empty_category_page_is_kept_out_of_search_results(): void
    {
        $this->get('/kategorija/pindjur')->assertOk()->assertSee('<meta name="robots" content="noindex, follow">', false);

        $this->product($this->pindjur);

        $this->get('/kategorija/pindjur')->assertOk()->assertDontSee('name="robots"', false);
    }

    public function test_the_intro_is_the_page_description(): void
    {
        $this->ajvar->update(['intro' => 'Ajvar od pečene paprike, kuvan na šporetu na drva.']);

        $this->get('/kategorija/ajvar')
            ->assertSee('<meta name="description" content="Ajvar od pečene paprike, kuvan na šporetu na drva.">', false)
            ->assertInertia(fn ($page) => $page->where('category.intro', 'Ajvar od pečene paprike, kuvan na šporetu na drva.'));
    }

    public function test_a_place_counts_a_subcategory_for_its_parent_too(): void
    {
        $ajvar = $this->product($this->ajvar);
        $this->product($this->ajvar, city: 'Niš');

        $this->get('/mesto/leskovac')->assertInertia(fn ($page) => $page
            ->has('products.data', 1)
            // The general category first, the narrower one under it.
            ->where('categories.0.slug', 'zimnica')
            ->where('categories.1.slug', 'ajvar'));

        $this->get('/mesto/leskovac/zimnica')->assertOk()
            ->assertSee('<title inertia>Domaća zimnica Leskovac: cena i prodaja | Vrelina juga</title>', false)
            ->assertInertia(fn ($page) => $page->has('products.data', 1)->where('products.data.0.id', $ajvar->id));
        $this->get('/mesto/leskovac/ajvar')->assertOk()
            ->assertSee('<title inertia>Domaći ajvar Leskovac: cena i prodaja | Vrelina juga</title>', false);
        $this->get('/mesto/leskovac/pindjur')->assertNotFound();

        $this->get('/kategorija/zimnica')->assertInertia(fn ($page) => $page->has('places', 2));
    }

    public function test_the_sitemap_and_the_home_page_follow_what_is_in_stock(): void
    {
        $this->product($this->ajvar);

        $this->get(route('sitemap.pages'))
            ->assertSee(url('/kategorija/zimnica'), false)
            ->assertSee(url('/kategorija/ajvar'), false)
            ->assertSee(url('/mesto/leskovac/zimnica'), false)
            ->assertDontSee(url('/kategorija/pindjur'), false);

        // The home page offers the general categories; the narrower ones are a click further.
        $this->get('/')->assertInertia(fn ($page) => $page->has('categories', 1)->where('categories.0.slug', 'zimnica'));
    }

    public function test_the_options_of_a_select_box_come_as_a_tree(): void
    {
        Category::factory()->create(['name' => 'Voće']);

        $this->assertSame(['Voće', 'Zimnica', 'Ajvar', 'Pinđur'], array_column(Category::options(), 'name'));
        $this->assertSame([null, null, $this->preserves->id, $this->preserves->id], array_column(Category::options(), 'parent_id'));
    }

    public function test_wanted_ads_are_filtered_and_announced_along_the_tree(): void
    {
        $buyer = User::factory()->create();
        $ad = $buyer->wantedAds()->create([
            'title' => 'Ajvar, 20 tegli',
            'body' => 'Za slavu, blagi.',
            'category_id' => $this->ajvar->id,
            'status' => WantedAd::STATUS_OPEN,
            'expires_at' => now()->addDays(WantedAd::DAYS_OPEN),
        ]);

        $this->get(route('wanted.index', ['kategorija' => $this->preserves->id]))->assertInertia(fn ($page) => $page->has('ads.data', 1));
        $this->get(route('wanted.index', ['kategorija' => $this->pindjur->id]))->assertInertia(fn ($page) => $page->has('ads.data', 0));

        $makesAjvar = $this->product($this->ajvar)->producer->user;
        // Filed their ajvar under the general category: told as well.
        $makesPreserves = $this->product($this->preserves)->producer->user;
        $makesPindjur = $this->product($this->pindjur)->producer->user;

        (new NotifyProducersOfWantedAd($ad))->handle();

        $this->assertSame(1, $makesAjvar->notifications()->count());
        $this->assertSame(1, $makesPreserves->notifications()->count());
        $this->assertSame(0, $makesPindjur->notifications()->count());

        // An ad under the general category reaches every subcategory.
        $general = $buyer->wantedAds()->create([...$ad->only(['title', 'body', 'status', 'expires_at']), 'category_id' => $this->preserves->id]);
        (new NotifyProducersOfWantedAd($general))->handle();

        $this->assertSame(1, $makesPindjur->notifications()->count());
    }
}
