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

        // The index points at the files; the files list the pages.
        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/xml')
            ->assertSee(route('sitemap.pages'))
            ->assertSee(route('sitemap.section', ['producers', 1]))
            ->assertSee(route('sitemap.section', ['products', 1]));

        $this->get(route('sitemap.pages'))->assertOk()->assertSee(route('legal.terms'));

        $this->get(route('sitemap.section', ['producers', 1]))
            ->assertOk()
            ->assertSee(route('marketplace.producers.show', $producer->slug))
            ->assertDontSee(route('marketplace.producers.show', $hidden->slug));

        $this->get(route('sitemap.section', ['products', 1]))
            ->assertOk()
            ->assertSee(route('marketplace.products.show', $product->slug))
            ->assertDontSee(route('marketplace.products.show', $draft->slug));

        $this->get('/sitemap-users-1.xml')->assertNotFound();

        $this->get('/robots.txt')->assertOk()->assertSee('Sitemap: '.route('sitemap'), false)->assertSee('Disallow: /admin', false);
    }

    public function test_the_legal_pages_are_public(): void
    {
        // Titled and described in the first HTML, like every public page.
        $this->get(route('legal.terms'))->assertOk()
            ->assertSee('<title inertia>Uslovi korišćenja | Vrelina juga</title>', false)
            ->assertSee('<meta name="description" content="Pravila korišćenja sajta Vrelina juga, za kupce i za proizvođače.">', false)
            ->assertInertia(fn ($page) => $page->component('legal/terms'));
        $this->get(route('legal.privacy'))->assertOk()
            ->assertSee('<title inertia>Politika privatnosti | Vrelina juga</title>', false)
            ->assertInertia(fn ($page) => $page->component('legal/privacy'));
        $this->get(route('marketplace.founding'))->assertOk()
            ->assertSee(' proizvođača | Vrelina juga</title>', false)
            ->assertSee('<link rel="canonical" href="'.route('marketplace.founding').'">', false);
    }
}
