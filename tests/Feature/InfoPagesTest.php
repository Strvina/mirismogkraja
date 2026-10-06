<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Support\Settings;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The pages that explain the site: a visitor has to learn there is no basket
 * here, and a producer has to see the prices, before either has an account.
 */
class InfoPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_info_page_is_public_and_has_its_own_meta(): void
    {
        $pages = [
            'info.how' => 'info/how-it-works',
            'info.producers' => 'info/for-producers',
            'info.about' => 'info/about',
            'info.faq' => 'info/faq',
            'info.contact' => 'info/contact',
        ];

        foreach ($pages as $route => $component) {
            $this->get(route($route))
                ->assertOk()
                ->assertSee('<link rel="canonical" href="'.route($route).'">', false)
                ->assertSee('<meta name="description"', false)
                ->assertInertia(fn ($page) => $page->component($component));

            $this->get(route('sitemap.pages'))->assertSee(route($route), false);
        }
    }

    public function test_the_producer_page_shows_the_prices_the_owner_set(): void
    {
        $this->seed(SubscriptionPlansSeeder::class);
        app(Settings::class)->put(['boost.profile_price' => '1500']);
        Producer::factory()->active()->create(['founding_number' => 3]);

        $this->get(route('info.producers'))->assertInertia(fn ($page) => $page
            ->has('plans', 3)
            ->where('plans.0.price_rsd', 2990)
            ->where('plans.2.name', 'Pro')
            ->where('boost.profile_price', 1500)
            ->where('founding.remaining', config('platform.founding_limit') - 3)
            ->has('featureLabels.statistics'));
    }

    public function test_the_questions_are_in_the_first_response_for_search_engines(): void
    {
        $response = $this->get(route('info.faq'))->assertOk();

        $response->assertSee('"@type":"FAQPage"', false)
            ->assertSee('Da li mogu da kupim preko sajta?', false)
            ->assertInertia(fn ($page) => $page->has('groups', 2)->has('groups.0.items.0.answer'));

        // In the reader's language, like the rest of the page.
        $this->withHeader('Accept-Language', 'en')->get(route('info.faq'))
            ->assertSee('Can I buy through the site?', false);
    }

    public function test_the_contact_address_comes_from_configuration(): void
    {
        config(['platform.contact_email' => 'pomoc@example.test']);

        $this->get(route('info.contact'))->assertInertia(fn ($page) => $page->where('contactEmail', 'pomoc@example.test'));
    }
}
