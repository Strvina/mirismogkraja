<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A public demo (APP_DEMO, the Dockerfile's "demo" stage) says so on every
 * page and stays out of search results; the real site does neither.
 */
class DemoModeTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_demo_says_so_and_keeps_out_of_search_results(): void
    {
        config(['platform.demo' => true]);

        $this->get('/')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
            ->assertInertia(fn ($page) => $page->where('demo', true));

        $this->assertSame("User-agent: *\nDisallow: /\n", $this->get('/robots.txt')->getContent());
    }

    public function test_the_real_site_is_open_to_search_engines(): void
    {
        $this->get('/')
            ->assertHeaderMissing('X-Robots-Tag')
            ->assertInertia(fn ($page) => $page->where('demo', false));

        $this->assertStringContainsString('Sitemap: ', $this->get('/robots.txt')->getContent());
    }
}
