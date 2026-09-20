<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicProductListTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_active_products_from_active_producers_are_listed()
    {
        $activeProducer = Producer::factory()->active()->create();
        $pendingProducer = Producer::factory()->create(['status' => 'pending']);

        Product::factory()->for($activeProducer)->create(['status' => 'active', 'name' => 'Vidljivo']);
        Product::factory()->for($activeProducer)->create(['status' => 'draft', 'name' => 'Draft']);
        Product::factory()->for($pendingProducer)->create(['status' => 'active', 'name' => 'Nevidljivo']);

        $response = $this->get(route('marketplace.products.index'));

        $response->assertInertia(fn ($page) => $page->has('products.data', 1)
            ->where('products.data.0.name', 'Vidljivo'));
    }

    public function test_can_filter_by_category()
    {
        $producer = Producer::factory()->active()->create();
        $categoryA = Category::factory()->create();
        $categoryB = Category::factory()->create();

        Product::factory()->for($producer)->for($categoryA)->create(['status' => 'active', 'name' => 'A proizvod']);
        Product::factory()->for($producer)->for($categoryB)->create(['status' => 'active', 'name' => 'B proizvod']);

        $response = $this->get(route('marketplace.products.index', ['category_id' => $categoryA->id]));

        $response->assertInertia(fn ($page) => $page->has('products.data', 1)
            ->where('products.data.0.name', 'A proizvod'));
    }

    public function test_can_sort_by_price_ascending()
    {
        $producer = Producer::factory()->active()->create();
        Product::factory()->for($producer)->create(['status' => 'active', 'price' => 500, 'name' => 'Skuplje']);
        Product::factory()->for($producer)->create(['status' => 'active', 'price' => 100, 'name' => 'Jeftinije']);

        $response = $this->get(route('marketplace.products.index', ['sort' => 'price_asc']));

        $response->assertInertia(fn ($page) => $page->where('products.data.0.name', 'Jeftinije'));
    }

    public function test_can_filter_by_producer()
    {
        $mine = Producer::factory()->active()->create();
        $other = Producer::factory()->active()->create();

        Product::factory()->for($mine)->create(['status' => 'active', 'name' => 'Moj proizvod']);
        Product::factory()->for($other)->create(['status' => 'active', 'name' => 'Tuđi proizvod']);

        $this->get(route('marketplace.products.index', ['producer_id' => $mine->id]))
            ->assertInertia(fn ($page) => $page->has('products.data', 1)->where('products.data.0.name', 'Moj proizvod'));
    }

    public function test_can_filter_to_items_in_stock()
    {
        $producer = Producer::factory()->active()->create();
        Product::factory()->for($producer)->create(['status' => 'active', 'stock_quantity' => 5, 'name' => 'Na stanju']);
        Product::factory()->for($producer)->create(['status' => 'active', 'stock_quantity' => 0, 'name' => 'Rasprodato']);

        $this->get(route('marketplace.products.index', ['in_stock' => 1]))
            ->assertInertia(fn ($page) => $page->has('products.data', 1)->where('products.data.0.name', 'Na stanju'));
    }

    public function test_can_filter_by_minimum_producer_rating()
    {
        $wellRated = Producer::factory()->active()->create();
        $poorlyRated = Producer::factory()->active()->create();

        Review::factory()->for($wellRated)->create(['rating' => 5]);
        Review::factory()->for($poorlyRated)->create(['rating' => 2]);

        Product::factory()->for($wellRated)->create(['status' => 'active', 'name' => 'Od dobrog proizvođača']);
        Product::factory()->for($poorlyRated)->create(['status' => 'active', 'name' => 'Od lošeg proizvođača']);

        $this->get(route('marketplace.products.index', ['min_rating' => 4]))
            ->assertInertia(fn ($page) => $page->has('products.data', 1)
                ->where('products.data.0.name', 'Od dobrog proizvođača'));
    }

    public function test_price_range_filters_are_inclusive()
    {
        $producer = Producer::factory()->active()->create();
        Product::factory()->for($producer)->create(['status' => 'active', 'price' => 100, 'name' => 'Jeftino']);
        Product::factory()->for($producer)->create(['status' => 'active', 'price' => 500, 'name' => 'Srednje']);
        Product::factory()->for($producer)->create(['status' => 'active', 'price' => 900, 'name' => 'Skupo']);

        $this->get(route('marketplace.products.index', ['min_price' => 100, 'max_price' => 500]))
            ->assertInertia(fn ($page) => $page->has('products.data', 2));
    }

    public function test_it_shows_twenty_products_per_page_by_default()
    {
        $producer = Producer::factory()->active()->create();
        Product::factory(25)->for($producer)->create(['status' => 'active']);

        $this->get(route('marketplace.products.index'))
            ->assertInertia(fn ($page) => $page->has('products.data', 20)
                ->where('products.total', 25)
                ->where('products.last_page', 2)
                ->where('perPage', 20));

        $this->get(route('marketplace.products.index', ['page' => 2]))
            ->assertInertia(fn ($page) => $page->has('products.data', 5));
    }

    public function test_page_size_can_be_changed_but_only_to_an_offered_option()
    {
        $producer = Producer::factory()->active()->create();
        Product::factory(15)->for($producer)->create(['status' => 'active']);

        $this->get(route('marketplace.products.index', ['per_page' => 10]))
            ->assertInertia(fn ($page) => $page->has('products.data', 10)->where('perPage', 10));

        // Anything not on the list falls back to the default page size.
        $this->get(route('marketplace.products.index', ['per_page' => 9999]))
            ->assertInertia(fn ($page) => $page->where('perPage', 20));
    }

    public function test_pagination_links_keep_the_active_filters()
    {
        $producer = Producer::factory()->active()->create();
        Product::factory(25)->for($producer)->create(['status' => 'active']);

        $this->get(route('marketplace.products.index', ['sort' => 'price_asc']))
            ->assertInertia(fn ($page) => $page->where(
                'products.next_page_url',
                fn (string $url) => str_contains($url, 'sort=price_asc')
            ));
    }

    public function test_favorited_products_are_flagged_for_the_signed_in_user()
    {
        $producer = Producer::factory()->active()->create();
        $product = Product::factory()->for($producer)->create(['status' => 'active']);

        $user = User::factory()->create();
        $user->favorites()->create(['favoritable_type' => 'household', 'favoritable_id' => 999]);
        $user->favorites()->create(['favoritable_type' => 'product', 'favoritable_id' => $product->id]);

        $this->actingAs($user)->get(route('marketplace.products.index'))
            ->assertInertia(fn ($page) => $page->where('products.data.0.is_favorited', true));
    }
}
