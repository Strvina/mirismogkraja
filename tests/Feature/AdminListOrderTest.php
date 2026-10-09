<?php

namespace Tests\Feature;

use App\Models\Boost;
use App\Models\Campaign;
use App\Models\CampaignParticipant;
use App\Models\Category;
use App\Models\Producer;
use App\Models\ProducerCertificate;
use App\Models\ProducerSubscription;
use App\Models\Product;
use App\Models\Referral;
use App\Models\Review;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\WantedAd;
use Database\Seeders\RolesSeeder;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Task 153: a list read page by page has to end its order on a column no
 * two rows share. Sorted by date alone, rows made in the same second (an
 * import, a seeder, two quick clicks) may come in a different order for
 * each page, so one shows twice and another never.
 *
 * Every admin list is opened and the query that reads its page is looked at.
 */
class AdminListOrderTest extends TestCase
{
    use RefreshDatabase;

    /** The lists that have a row below, so their page is certainly read. */
    private const LISTS = [
        'admin.boosts.index',
        'admin.campaigns.index',
        'admin.certificates.index',
        'admin.memberships.index',
        'admin.posts.index',
        'admin.producers.index',
        'admin.products.index',
        'admin.referrals.index',
        'admin.reviews.index',
        'admin.users.index',
        'admin.wanted.index',
    ];

    public function test_every_admin_list_ends_its_order_on_the_id(): void
    {
        $this->seed([RolesSeeder::class, SubscriptionPlansSeeder::class]);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $this->aRowInEveryList();

        $pages = [];
        $current = null;
        DB::listen(function (QueryExecuted $query) use (&$pages, &$current) {
            if (preg_match('/ limit \d+ offset \d+$/', $query->sql)) {
                $pages[$current][] = $query->sql;
            }
        });

        $lists = collect(Route::getRoutes()->getRoutes())
            ->filter(fn ($route) => str_starts_with((string) $route->getName(), 'admin.') && str_ends_with($route->getName(), '.index'))
            ->map(fn ($route) => $route->getName());

        foreach ($lists as $current) {
            $this->actingAs($admin)->get(route($current))->assertOk();
        }

        $this->assertSame([], array_values(array_diff(self::LISTS, array_keys($pages))), 'A list with a row in it read no page.');

        $loose = collect($pages)
            ->flatMap(fn (array $queries, string $list) => array_map(fn (string $sql) => "{$list}: {$sql}", $queries))
            ->reject(fn (string $line) => preg_match('/["`]id["`] (asc|desc) limit \d+ offset \d+$/', $line))
            ->values()
            ->all();

        $this->assertSame([], $loose);
    }

    private function aRowInEveryList(): void
    {
        $producer = Producer::factory()->active()->create();
        Product::factory()->for($producer)->create();
        Review::factory()->pending()->create(['producer_id' => $producer->id]);

        $producer->posts()->create(['type' => 'story', 'title' => 'Kako pravimo sir', 'slug' => 'kako-pravimo-sir', 'body' => 'Od mleka do koluta.', 'status' => 'published']);
        $producer->certificates()->create(['type' => 'organic', 'title' => 'Organski med', 'file_path' => 'certificates/a.pdf', 'status' => ProducerCertificate::STATUS_PENDING]);

        $paid = ['producer_id' => $producer->id, 'status' => 'pending_payment', 'reference' => '97-1', 'amount_rsd' => 1000];
        ProducerSubscription::create([...$paid, 'subscription_plan_id' => SubscriptionPlan::value('id')]);
        Boost::create([...$paid, 'boostable_type' => Boost::PROFILE, 'boostable_id' => $producer->id, 'days' => 7]);
        CampaignParticipant::create([...$paid, 'campaign_id' => Campaign::create([
            'name' => 'Ajvar sezona',
            'slug' => 'ajvar-sezona',
            'starts_on' => today()->subDay(),
            'ends_on' => today()->addWeeks(3),
            'price_rsd' => 2490,
            'is_active' => true,
        ])->id]);

        $buyer = User::factory()->create();
        Referral::create(['referrer_producer_id' => $producer->id, 'referred_user_id' => $buyer->id, 'status' => Referral::STATUS_PENDING]);
        $buyer->wantedAds()->create([
            'title' => 'Bagremov med, 10 kg',
            'body' => 'Treba mi za zimu, najbolje iz okoline Niša.',
            'category_id' => Category::factory()->create()->id,
            'status' => WantedAd::STATUS_OPEN,
            'expires_at' => now()->addDays(WantedAd::DAYS_OPEN),
        ]);
    }
}
