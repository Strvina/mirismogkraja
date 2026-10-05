<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Product;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\SearchMisses;
use App\Services\SubscriptionService;
use Database\Seeders\RolesSeeder;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** "Šta kupci traže, a niko ne nudi". */
class SearchMissesTest extends TestCase
{
    use RefreshDatabase;

    private const BROWSER = 'Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile';

    /** A catalogue search by a person at this address. */
    private function search(string $term, string $ip = '10.0.0.1', array $extra = [], string $agent = self::BROWSER): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->withHeader('User-Agent', $agent)
            ->get(route('marketplace.products.index', ['q' => $term, ...$extra]))
            ->assertOk();
    }

    private function hits(string $term): int
    {
        return (int) DB::table('search_misses')->where('term', $term)->sum('hits');
    }

    public function test_a_search_that_finds_nothing_is_counted_once_per_person_a_day(): void
    {
        $this->search('Kozji  SIR');
        $this->search('kozji sir');
        $this->search('kozji sir', '10.0.0.2');

        // One term however it was typed; two people, not three searches.
        $this->assertSame(2, $this->hits('kozji sir'));
        $this->assertSame(1, DB::table('search_misses')->count());

        // Tomorrow the same person counts again.
        $this->travel(1)->days();
        $this->search('kozji sir');
        $this->assertSame(3, $this->hits('kozji sir'));
    }

    public function test_a_search_that_finds_something_is_not_a_miss(): void
    {
        $producer = Producer::factory()->active()->create(['name' => 'Sirana Petrović']);
        Product::factory()->for($producer)->create(['name' => 'Bagremov med', 'status' => 'active']);

        // Finds a product.
        $this->search('bagremov');
        // Finds no product, but the producer by name.
        $this->search('petrović');

        $this->assertSame(0, DB::table('search_misses')->count());
    }

    public function test_an_empty_list_caused_by_another_filter_is_not_a_miss(): void
    {
        $this->search('kozji sir', extra: ['city' => 'Niš']);
        $this->search('kozji sir', '10.0.0.2', ['in_stock' => 1]);
        $this->search('kozji sir', '10.0.0.3', ['min_price' => 500]);

        $this->assertSame(0, DB::table('search_misses')->count());
    }

    public function test_robots_and_things_that_are_not_products_are_not_kept(): void
    {
        $this->search('kozji sir', agent: 'Googlebot/2.1 (+http://www.google.com/bot.html)');
        $this->search('kozji sir', '10.0.0.2', agent: '');

        // Too short to mean anything; an address; a phone number.
        $this->search('ab', '10.0.0.3');
        $this->search('marko@example.com', '10.0.0.4');
        $this->search('064 123 4567', '10.0.0.5');
        $this->search('064/123-45-67', '10.0.0.6');

        $this->assertSame(0, DB::table('search_misses')->count());

        // A number that is part of a product is fine.
        $this->search('med 500g', '10.0.0.7');
        $this->assertSame(1, $this->hits('med 500g'));
    }

    public function test_the_admin_sees_what_is_missing_most_first(): void
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        foreach (['10.0.0.1', '10.0.0.2', '10.0.0.3'] as $ip) {
            $this->search('kozji sir', $ip);
        }
        $this->search('sok od aronije');

        $this->actingAs(User::factory()->create())->get(route('admin.search-misses.index'))->assertForbidden();

        $this->actingAs($admin)->get(route('admin.search-misses.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/search-misses/index')
                ->where('days', 30)
                ->has('terms', 2)
                ->where('terms.0.term', 'kozji sir')
                ->where('terms.0.total', 3)
                ->where('terms.1.term', 'sok od aronije'));

        // Outside the chosen period, nothing.
        $this->travel(10)->days();
        $this->actingAs($admin)->get(route('admin.search-misses.index', ['dana' => 7]))
            ->assertInertia(fn ($page) => $page->where('days', 7)->has('terms', 0));
        // An unknown period falls back to the default.
        $this->actingAs($admin)->get(route('admin.search-misses.index', ['dana' => 9999]))
            ->assertInertia(fn ($page) => $page->where('days', 30)->has('terms', 2));
    }

    public function test_producers_on_a_plan_with_statistics_see_terms_more_than_one_person_searched(): void
    {
        $this->seed(SubscriptionPlansSeeder::class);
        $free = Producer::factory()->active()->create();
        $premium = Producer::factory()->active()->create();
        app(SubscriptionService::class)->grant($premium, SubscriptionPlan::where('slug', 'premium')->sole());

        $this->search('kozji sir');
        $this->search('kozji sir', '10.0.0.2');
        // One person's one-off query is not passed around.
        $this->search('poklon za tetku iz Kanade', '10.0.0.3');

        $this->actingAs($premium->user)->get(route('producers.statistics', $premium))
            ->assertInertia(fn ($page) => $page
                ->has('wanted', 1)
                ->where('wanted.0.term', 'kozji sir')
                ->where('wanted.0.total', 2));

        // Behind the lock, none of the real list.
        $this->actingAs($free->user)->get(route('producers.statistics', $free))
            ->assertInertia(fn ($page) => $page->where('unlocked', false)->where('wanted', null));
    }

    public function test_old_counters_are_cleared(): void
    {
        $this->search('kozji sir');
        $this->travel(SearchMisses::KEEP_DAYS + 1)->days();
        $this->search('sok od aronije');

        $this->assertSame(1, app(SearchMisses::class)->prune());
        $this->assertSame(['sok od aronije'], DB::table('search_misses')->pluck('term')->all());
    }
}
