<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Household;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicProductListTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_active_products_from_active_households_are_listed()
    {
        $activeHousehold = Household::factory()->active()->create();
        $pendingHousehold = Household::factory()->create(['status' => 'pending']);

        Product::factory()->for($activeHousehold)->create(['status' => 'active', 'name' => 'Vidljivo']);
        Product::factory()->for($activeHousehold)->create(['status' => 'draft', 'name' => 'Draft']);
        Product::factory()->for($pendingHousehold)->create(['status' => 'active', 'name' => 'Nevidljivo']);

        $response = $this->get(route('marketplace.products.index'));

        $response->assertInertia(fn ($page) => $page->has('products', 1)
            ->where('products.0.name', 'Vidljivo'));
    }

    public function test_can_filter_by_category()
    {
        $household = Household::factory()->active()->create();
        $categoryA = Category::factory()->create();
        $categoryB = Category::factory()->create();

        Product::factory()->for($household)->for($categoryA)->create(['status' => 'active', 'name' => 'A proizvod']);
        Product::factory()->for($household)->for($categoryB)->create(['status' => 'active', 'name' => 'B proizvod']);

        $response = $this->get(route('marketplace.products.index', ['category_id' => $categoryA->id]));

        $response->assertInertia(fn ($page) => $page->has('products', 1)
            ->where('products.0.name', 'A proizvod'));
    }

    public function test_can_sort_by_price_ascending()
    {
        $household = Household::factory()->active()->create();
        Product::factory()->for($household)->create(['status' => 'active', 'price' => 500, 'name' => 'Skuplje']);
        Product::factory()->for($household)->create(['status' => 'active', 'price' => 100, 'name' => 'Jeftinije']);

        $response = $this->get(route('marketplace.products.index', ['sort' => 'price_asc']));

        $response->assertInertia(fn ($page) => $page->where('products.0.name', 'Jeftinije'));
    }
}
