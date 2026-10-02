<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Product;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\SubscriptionService;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Tests\TestCase;

/**
 * A producer's statistics (task 20.6): daily counters of views and contact
 * clicks, shown to Premium and Pro members.
 */
class ProducerStatisticsTest extends TestCase
{
    use RefreshDatabase;

    private const BROWSER = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SubscriptionPlansSeeder::class);
    }

    private function hits(string $event, int $productId = 0): int
    {
        return (int) DB::table('producer_stats')->where('event', $event)->where('product_id', $productId)->sum('hits');
    }

    public function test_visits_add_up_in_one_row_per_day(): void
    {
        $producer = Producer::factory()->active()->create();

        // Two visitors, the second of them reloading: two views, not three.
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])->withHeader('User-Agent', self::BROWSER)->get(route('marketplace.producers.show', $producer->slug))->assertOk();
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.2'])->withHeader('User-Agent', self::BROWSER)->get(route('marketplace.producers.show', $producer->slug))->assertOk();
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.2'])->withHeader('User-Agent', self::BROWSER)->get(route('marketplace.producers.show', $producer->slug))->assertOk();

        $this->assertSame(2, $this->hits('profile_view'));
        $this->assertSame(1, DB::table('producer_stats')->count());
    }

    /** The public click address cannot be hammered into big numbers. */
    public function test_repeated_clicks_from_one_visitor_count_once(): void
    {
        $producer = Producer::factory()->active()->create();

        foreach (range(1, 5) as $click) {
            $this->withHeader('User-Agent', self::BROWSER)->post(route('statistics.click', [$producer, 'whatsapp_click']))->assertNoContent();
        }

        $this->assertSame(1, $this->hits('whatsapp_click'));
    }

    public function test_a_product_view_is_counted_for_its_product(): void
    {
        $product = Product::factory()->for(Producer::factory()->active())->create();

        $this->withHeader('User-Agent', self::BROWSER)->get(route('marketplace.products.show', $product->slug))->assertOk();

        $this->assertSame(1, $this->hits('product_view', $product->id));
    }

    /** None of these is a person newly taking an interest. */
    public function test_bots_the_owner_and_refreshes_are_not_counted(): void
    {
        $producer = Producer::factory()->active()->create();
        $url = route('marketplace.producers.show', $producer->slug);

        $this->withHeader('User-Agent', 'facebookexternalhit/1.1')->get($url);
        $this->withHeader('User-Agent', 'Googlebot/2.1')->get($url);
        $this->withHeader('User-Agent', '')->get($url);
        $this->actingAs($producer->user)->withHeader('User-Agent', self::BROWSER)->get($url);
        $this->withHeaders(['User-Agent' => self::BROWSER, 'X-Revalidate' => '1'])->get($url);
        $this->withHeaders([
            'User-Agent' => self::BROWSER,
            'X-Inertia' => 'true',
            'X-Inertia-Version' => Inertia::getVersion(),
            'X-Inertia-Partial-Component' => 'marketplace/producers/show',
            'X-Inertia-Partial-Data' => 'reviews',
        ])->get($url);

        $this->assertSame(0, (int) DB::table('producer_stats')->sum('hits'));
    }

    public function test_contact_clicks_are_counted_and_unknown_events_refused(): void
    {
        $producer = Producer::factory()->active()->create();

        $this->withHeader('User-Agent', self::BROWSER)->post(route('statistics.click', [$producer->id, 'viber_click']))->assertNoContent();
        $this->withHeader('User-Agent', self::BROWSER)->post(route('statistics.click', [$producer->id, 'drop_table']))->assertNotFound();

        $hidden = Producer::factory()->create(['status' => 'pending']);
        $this->withHeader('User-Agent', self::BROWSER)->post(route('statistics.click', [$hidden->id, 'viber_click']))->assertNotFound();

        $this->assertSame(1, $this->hits('viber_click'));
    }

    public function test_a_premium_owner_sees_the_numbers(): void
    {
        $producer = Producer::factory()->active()->create();
        $popular = Product::factory()->for($producer)->create(['name' => 'Bagremov med']);
        $service = app(SubscriptionService::class);
        $service->confirmPayment($service->request($producer, SubscriptionPlan::where('slug', 'premium')->sole()), $producer->user_id);

        foreach (range(1, 3) as $visit) {
            $this->withServerVariables(['REMOTE_ADDR' => "10.0.0.{$visit}"])->withHeader('User-Agent', self::BROWSER)->get(route('marketplace.products.show', $popular->slug));
        }
        $this->withHeader('User-Agent', self::BROWSER)->get(route('marketplace.producers.show', $producer->slug));

        $this->actingAs($producer->user)->get(route('producers.statistics', $producer))->assertInertia(fn ($page) => $page
            ->where('unlocked', true)
            ->where('stats.totals.profile_view', 1)
            ->where('stats.totals.product_view', 3)
            ->where('stats.totals.whatsapp_click', 0)
            ->has('stats.daily', 30)
            ->where('stats.daily.29.views', 1)
            ->where('stats.topProducts.0.name', 'Bagremov med')
            ->where('stats.topProducts.0.views', 3));
    }

    /** Below the plan the page still opens - locked, and with no real figures in it. */
    public function test_without_the_plan_the_page_is_locked_and_carries_no_figures(): void
    {
        $producer = Producer::factory()->active()->create();
        $this->withHeader('User-Agent', self::BROWSER)->get(route('marketplace.producers.show', $producer->slug));

        $this->actingAs($producer->user)->get(route('producers.statistics', $producer))
            ->assertInertia(fn ($page) => $page->where('unlocked', false)->where('stats', null));
    }

    public function test_only_the_owner_can_open_the_statistics(): void
    {
        $producer = Producer::factory()->active()->create();

        $this->actingAs(User::factory()->create())->get(route('producers.statistics', $producer))->assertForbidden();
    }
}
