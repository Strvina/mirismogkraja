<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicProductPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_product_of_active_producer_is_visible()
    {
        $producer = Producer::factory()->active()->create();
        $product = Product::factory()->for($producer)->create(['status' => 'active', 'name' => 'Domaći ajvar']);

        $this->get(route('marketplace.products.show', $product))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('product.name', 'Domaći ajvar'));
    }

    public function test_product_of_pending_producer_returns_404()
    {
        $producer = Producer::factory()->create(['status' => 'pending']);
        $product = Product::factory()->for($producer)->create(['status' => 'active']);

        $this->get(route('marketplace.products.show', $product))->assertNotFound();
    }

    public function test_draft_product_returns_404_even_if_producer_is_active()
    {
        $producer = Producer::factory()->active()->create();
        $product = Product::factory()->for($producer)->create(['status' => 'draft']);

        $this->get(route('marketplace.products.show', $product))->assertNotFound();
    }

    /**
     * Archiving an account soft-deletes its producers but leaves the products
     * in place, so the product's own status alone cannot decide visibility.
     */
    public function test_product_of_an_archived_producer_returns_404()
    {
        $producer = Producer::factory()->active()->create();
        $product = Product::factory()->for($producer)->create(['status' => 'active']);

        $producer->delete();

        $this->get(route('marketplace.products.show', $product))->assertNotFound();
        $this->get(route('marketplace.products.index'))->assertInertia(fn ($page) => $page->has('products.data', 0));
    }
}
