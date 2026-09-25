<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Task 21: most traffic for home-made food arrives from a search, so the
 * producer and product pages have to be findable - and the two legal pages
 * have to exist and be reachable, given that the platform is not a party to
 * the sale.
 */
class SitemapAndLegalPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_sitemap_lists_published_pages_only(): void
    {
        $producer = Producer::factory()->active()->create();
        $product = Product::factory()->for($producer)->create(['status' => 'active']);

        $hidden = Producer::factory()->create(['status' => 'pending']);
        $draft = Product::factory()->for($producer)->create(['status' => 'draft']);

        $response = $this->get('/sitemap.xml');

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/xml')
            ->assertSee(route('marketplace.producers.show', $producer->slug))
            ->assertSee(route('marketplace.products.show', $product->slug))
            ->assertSee(route('legal.terms'))
            ->assertDontSee(route('marketplace.producers.show', $hidden->slug))
            ->assertDontSee(route('marketplace.products.show', $draft->slug));
    }

    public function test_the_legal_pages_are_public(): void
    {
        $this->get(route('legal.terms'))->assertOk()->assertInertia(fn ($page) => $page->component('legal/terms'));
        $this->get(route('legal.privacy'))->assertOk()->assertInertia(fn ($page) => $page->component('legal/privacy'));
    }
}
