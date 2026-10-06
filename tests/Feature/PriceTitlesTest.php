<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Services\CategoryPrices;
use App\Support\Price;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * People type the product and then "cena" or "prodaja". The pages they
 * should land on say both in the title, and a category says what its
 * products cost - from the listings themselves.
 */
class PriceTitlesTest extends TestCase
{
    use RefreshDatabase;

    private Category $preserves;

    private Category $ajvar;

    protected function setUp(): void
    {
        parent::setUp();

        $this->preserves = Category::factory()->create(['name' => 'Zimnica', 'slug' => 'zimnica', 'search_name' => 'Domaća zimnica']);
        $this->ajvar = Category::factory()->create(['name' => 'Ajvar', 'slug' => 'ajvar', 'search_name' => 'Domaći ajvar', 'parent_id' => $this->preserves->id]);
    }

    private function product(Category $category, float $price, string $unit, array $attributes = []): Product
    {
        return Product::factory()
            ->for(Producer::factory()->active()->create(['name' => 'Domaćinstvo Nićić', 'city' => 'Leskovac']))
            ->create(['category_id' => $category->id, 'status' => 'active', 'price' => $price, 'unit' => $unit, ...$attributes]);
    }

    public function test_a_category_says_what_its_products_cost_per_unit(): void
    {
        $this->product($this->ajvar, 550, 'kg');
        $this->product($this->ajvar, 800, 'kg');
        $this->product($this->ajvar, 300, 'kom');
        // Filed under the general category: counts there, not under the narrower one.
        $this->product($this->preserves, 1200, 'kg');
        // Not on sale: says nothing about the price.
        $this->product($this->ajvar, 5, 'kg', ['status' => 'draft']);
        Product::factory()->for(Producer::factory()->create(['status' => 'pending']))->create(['category_id' => $this->ajvar->id, 'status' => 'active', 'price' => 9000, 'unit' => 'kg']);

        $prices = app(CategoryPrices::class);

        $this->assertSame([
            ['unit' => 'kg', 'from' => 550.0, 'to' => 800.0, 'products' => 2],
            ['unit' => 'kom', 'from' => 300.0, 'to' => 300.0, 'products' => 1],
        ], $prices->for($this->ajvar));
        $this->assertSame('550–800 RSD/kg', $prices->summary($this->ajvar));
        $this->assertSame('550–1.200 RSD/kg', $prices->summary($this->preserves));

        $this->get('/kategorija/ajvar')
            ->assertOk()
            ->assertSee('<title inertia>Domaći ajvar: cena i prodaja od proizvođača | Vrelina juga</title>', false)
            ->assertSee('<meta name="description" content="Domaći ajvar direktno od proizvođača sa juga Srbije. Cena: 550–800 RSD/kg. Pišite proizvođaču, bez posrednika.">', false)
            ->assertInertia(fn ($page) => $page->has('prices', 2)->where('prices.0.unit', 'kg')->where('prices.0.products', 2));
    }

    public function test_a_category_with_nothing_in_it_names_no_price(): void
    {
        $this->assertSame([], app(CategoryPrices::class)->for($this->ajvar));
        $this->assertNull(app(CategoryPrices::class)->summary($this->ajvar));

        $this->get('/kategorija/ajvar')
            ->assertOk()
            ->assertDontSee('Cena:', false)
            ->assertInertia(fn ($page) => $page->where('prices', []));

        // One listing is one price, not a range.
        $this->product($this->preserves, 650, 'kom');
        $this->assertSame('650 RSD/kom', app(CategoryPrices::class)->summary($this->preserves));
        // Paras are written only when there are any.
        $this->assertSame(['1.200', '804,15'], [Price::format(1200), Price::format('804.15')]);
    }

    public function test_the_catalogue_itself_names_no_category_and_no_price_range(): void
    {
        $this->product($this->ajvar, 550, 'kg');

        $this->get('/proizvodi')
            ->assertOk()
            ->assertSee('<title inertia>Domaći proizvodi: cene i prodaja od proizvođača | Vrelina juga</title>', false)
            ->assertInertia(fn ($page) => $page->where('prices', [])->where('category', null));
    }

    public function test_a_product_is_titled_and_described_by_what_people_ask_about_it(): void
    {
        $product = $this->product($this->ajvar, 650, 'kg', ['name' => 'Ajvar ljuti', 'description' => 'Od pečene paprike, kuvan na šporetu na drva.']);

        $html = $this->get(route('marketplace.products.show', $product->slug))
            ->assertOk()
            ->assertSee('<title inertia>Ajvar ljuti — cena i prodaja | Domaćinstvo Nićić</title>', false)
            ->assertSee('<meta name="description" content="Ajvar ljuti, Domaćinstvo Nićić (Leskovac). Cena: 650 RSD/kg. Od pečene paprike, kuvan na šporetu na drva.">', false)
            ->assertInertia(fn ($page) => $page->where('product.category.slug', 'ajvar')->where('product.category.parent.slug', 'zimnica'))
            ->getContent();

        // Filed under a subcategory: the structured data says where from the
        // top, the bracket escaped as the page prints its JSON.
        $this->assertStringContainsString('"category":'.json_encode('Zimnica > Ajvar', JSON_HEX_TAG), $html);
    }

    public function test_a_place_and_the_wanted_ads_are_titled_as_people_search(): void
    {
        $this->product($this->ajvar, 650, 'kg');

        $this->get('/mesto/leskovac/ajvar')
            ->assertSee('<title inertia>Domaći ajvar Leskovac: cena i prodaja | Vrelina juga</title>', false);
        $this->get(route('wanted.index'))
            ->assertSee('<title inertia>Kupujem domaće proizvode: oglasi kupaca | Vrelina juga</title>', false);
    }
}
