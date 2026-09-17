<?php

namespace Tests\Feature;

use App\Models\Household;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicProductPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_product_of_active_household_is_visible()
    {
        $household = Household::factory()->active()->create();
        $product = Product::factory()->for($household)->create(['status' => 'active', 'name' => 'Domaći ajvar']);

        $this->get(route('marketplace.products.show', $product))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('product.name', 'Domaći ajvar'));
    }

    public function test_product_of_pending_household_returns_404()
    {
        $household = Household::factory()->create(['status' => 'pending']);
        $product = Product::factory()->for($household)->create(['status' => 'active']);

        $this->get(route('marketplace.products.show', $product))->assertNotFound();
    }

    public function test_draft_product_returns_404_even_if_household_is_active()
    {
        $household = Household::factory()->active()->create();
        $product = Product::factory()->for($household)->create(['status' => 'draft']);

        $this->get(route('marketplace.products.show', $product))->assertNotFound();
    }
}
