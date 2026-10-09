<?php

namespace Tests\Feature;

use App\Models\Boost;
use App\Models\Campaign;
use App\Models\CampaignParticipant;
use App\Models\Category;
use App\Models\Producer;
use App\Models\ProducerCertificate;
use App\Models\ProducerMessage;
use App\Models\ProducerSubscription;
use App\Models\Product;
use App\Models\Review;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\WantedAd;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Task 150: every signed-in route that names a record in its address, and
 * who may use it.
 *
 * The routes are read from the router, not from a list kept by hand: one
 * added tomorrow fails the first test until it is written down here, either
 * as somebody's (and then a stranger is sent to it, in the second test) or
 * as open to any signed-in user, with the reason.
 *
 * The stranger is the hardest one to tell apart: verified, and the owner of
 * a published producer of their own. Admin routes are AdminGuardTest's.
 */
class PrivateRouteInventoryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Routes that act for whoever is signed in, on a page that is public
     * anyway: there is no owner to be mistaken for. Route name => why.
     */
    private const FOR_ANY_USER = [
        'messages.show' => "the buyer's own conversation with that producer",
        'messages.store' => "the buyer's own conversation with that producer",
        'inquiries.store' => 'a buyer asks about a public product',
        'products.alert' => 'a buyer asks to hear when a public product is back',
        'producers.follow' => 'a buyer follows a public producer',
        'reviews.store' => 'a buyer reviews a public producer; ReviewPolicy says who may',
        'campaigns.join' => 'the producer is named in the form: the third test',
        'wanted.respond' => 'the producer is named in the form: the third test',
    ];

    /** Looked up among the visitor's own records, so for anyone else it does not exist. */
    private const NOT_FOUND_BY_DESIGN = ['notifications.open' => 404];

    private Producer $producer;

    private User $buyer;

    private User $stranger;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(SubscriptionPlansSeeder::class);

        $this->producer = Producer::factory()->active()->create();
        $this->buyer = User::factory()->create();
        $this->stranger = Producer::factory()->active()->create()->user;
    }

    public function test_every_private_route_with_a_record_in_its_address_is_accounted_for(): void
    {
        $private = collect(Route::getRoutes()->getRoutes())
            ->filter(fn ($route) => str_contains($route->uri(), '{'))
            ->filter(fn ($route) => in_array('auth', $route->gatherMiddleware(), true))
            ->reject(fn ($route) => in_array('role:admin', $route->gatherMiddleware(), true))
            ->map(fn ($route) => $route->getName())
            ->sort()
            ->values()
            ->all();

        $accountedFor = collect([...array_keys($this->someoneElses()), ...array_keys(self::FOR_ANY_USER)])->sort()->values()->all();

        $this->assertSame($accountedFor, $private, 'A private route is not in this inventory, or the inventory names one that is gone.');
    }

    public function test_a_stranger_is_refused_on_every_route_that_belongs_to_someone_else(): void
    {
        $let = [];

        foreach ($this->someoneElses() as $name => $target) {
            $method = Route::getRoutes()->getByName($name)->methods()[0];
            $url = is_string($target) ? $target : route($name, $target);

            $status = $this->actingAs($this->stranger)->call($method, $url)->getStatusCode();

            // 403, not 404: the record was found and the visitor was the
            // reason. A parameter that no longer fits its route would answer
            // 404 to everyone and prove nothing.
            if ($status !== (self::NOT_FOUND_BY_DESIGN[$name] ?? 403)) {
                $let[] = "{$method} {$name} answered {$status}";
            }
        }

        $this->assertSame([], $let);
    }

    /** The one 404 above is a real one: the owner opens the same address. */
    public function test_the_owner_opens_the_notification_a_stranger_cannot_find(): void
    {
        $url = route('notifications.open', $this->someoneElses()['notifications.open']);

        $this->actingAs($this->stranger)->get($url)->assertNotFound();
        $this->actingAs($this->producer->user)->get($url)->assertRedirect();
    }

    public function test_a_form_cannot_name_someone_elses_producer(): void
    {
        $campaign = $this->campaign();
        $ad = $this->wantedAd();
        $theirs = ['producer_id' => $this->producer->id];

        $forms = [
            'memberships.store' => [[], [...$theirs, 'plan_id' => SubscriptionPlan::where('is_active', true)->value('id')]],
            'boosts.store' => [[], [...$theirs, 'kind' => 'profile']],
            'campaigns.join' => [$campaign, $theirs],
            'wanted.respond' => [$ad, [...$theirs, 'body' => 'Imamo bagremov med.']],
        ];

        foreach ($forms as $name => [$parameters, $data]) {
            $this->actingAs($this->stranger)->post(route($name, $parameters), $data)->assertForbidden();
        }

        $this->assertSame(0, ProducerSubscription::count());
        $this->assertSame(0, Boost::count());
        $this->assertSame(0, CampaignParticipant::count());
        $this->assertSame(0, ProducerMessage::count());
    }

    /**
     * One of everything a producer or a buyer owns, and the route that
     * reaches it. Route name => its parameters, or a ready address.
     *
     * @return array<string, mixed>
     */
    private function someoneElses(): array
    {
        $producer = $this->producer;
        $owner = $producer->user;

        $product = Product::factory()->for($producer)->create();
        $picture = $product->images()->create(['path' => 'products/a.jpg', 'order' => 0]);
        $photo = $producer->images()->create(['path' => 'producers/gallery/a.jpg', 'order' => 0]);
        $reply = $producer->quickReplies()->create(['title' => 'Dostava', 'body' => 'Šaljemo kurirom.']);
        $market = $producer->markets()->create(['name' => 'Zelena pijaca', 'city' => 'Niš', 'days' => [6], 'opens_at' => '07:00', 'closes_at' => '13:00']);
        $post = $producer->posts()->create(['type' => 'story', 'title' => 'Kako pravimo sir', 'slug' => 'kako-pravimo-sir', 'body' => 'Od mleka do koluta.', 'status' => 'published']);
        $certificate = $producer->certificates()->create(['type' => 'organic', 'title' => 'Organski med', 'file_path' => 'certificates/a.pdf', 'status' => ProducerCertificate::STATUS_PENDING]);

        $paid = ['producer_id' => $producer->id, 'status' => 'pending_payment', 'reference' => '97-1', 'amount_rsd' => 1000];
        $subscription = ProducerSubscription::create([...$paid, 'subscription_plan_id' => SubscriptionPlan::value('id')]);
        $boost = Boost::create([...$paid, 'boostable_type' => Boost::PROFILE, 'boostable_id' => $producer->id, 'days' => 7]);
        $place = CampaignParticipant::create([...$paid, 'campaign_id' => $this->campaign()->id]);

        ProducerMessage::create(['producer_id' => $producer->id, 'buyer_id' => $this->buyer->id, 'sender_id' => $this->buyer->id, 'body' => 'Imate li sira?']);
        $review = Review::factory()->create(['producer_id' => $producer->id, 'user_id' => $this->buyer->id]);
        $ad = $this->wantedAd();
        $notification = $owner->notifications()->create(['id' => (string) Str::uuid(), 'type' => 'site', 'data' => ['url' => '/']]);

        return [
            'producers.edit' => $producer,
            'producers.update' => $producer,
            'producers.destroy' => $producer,
            'producers.poster' => $producer,
            'producers.statistics' => $producer,
            'producers.inquiries.export' => $producer,
            'producers.referrals.index' => $producer,
            'producers.pause.edit' => $producer,
            'producers.pause.update' => $producer,

            'producers.quick-replies.index' => $producer,
            'producers.quick-replies.store' => $producer,
            'producers.quick-replies.starters' => $producer,
            'producers.quick-replies.update' => [$producer, $reply],
            'producers.quick-replies.destroy' => [$producer, $reply],

            'producers.images.store' => $producer,
            'producers.images.destroy' => [$producer, $photo],

            'producers.markets.index' => $producer,
            'producers.markets.store' => $producer,
            'producers.markets.update' => [$producer, $market],
            'producers.markets.destroy' => [$producer, $market],

            'producers.posts.index' => $producer,
            'producers.posts.create' => $producer,
            'producers.posts.store' => $producer,
            'producers.posts.edit' => [$producer, $post],
            'producers.posts.update' => [$producer, $post],
            'producers.posts.destroy' => [$producer, $post],

            'producers.products.index' => $producer,
            'producers.products.create' => $producer,
            'producers.products.store' => $producer,
            'producers.products.edit' => [$producer, $product],
            'producers.products.update' => [$producer, $product],
            'producers.products.destroy' => [$producer, $product],
            'producers.products.images.store' => [$producer, $product],
            'producers.products.images.destroy' => [$producer, $product, $picture],
            'producers.products.images.primary' => [$producer, $product, $picture],

            'producers.certificates.index' => $producer,
            'producers.certificates.store' => $producer,
            'producers.certificates.destroy' => [$producer, $certificate],
            'producers.certificates.file' => [$producer, $certificate],

            'memberships.slip' => $subscription,
            'boosts.slip' => $boost,
            'campaigns.slip' => $place,
            'payment-slips.qr' => ['clanarina', $subscription->id],

            'messages.thread' => [$producer, $this->buyer],
            'messages.thread.store' => [$producer, $this->buyer],
            'messages.block' => [$producer, $this->buyer],
            'messages.outcome' => [$producer, $this->buyer],

            'reviews.reply' => $review,
            'reviews.destroy' => $review,
            'wanted.close' => $ad,
            'wanted.destroy' => $ad,
            'notifications.open' => [$notification->id],

            // Somebody else's confirmation link, with its signature intact.
            'verification.verify' => URL::temporarySignedRoute('verification.verify', now()->addHour(), [
                'id' => $owner->id,
                'hash' => sha1($owner->email),
            ]),
        ];
    }

    private function campaign(): Campaign
    {
        return Campaign::firstOrCreate(['slug' => 'ajvar-sezona'], [
            'name' => 'Ajvar sezona',
            'starts_on' => today()->subDay(),
            'ends_on' => today()->addWeeks(3),
            'price_rsd' => 2490,
            'is_active' => true,
        ]);
    }

    private function wantedAd(): WantedAd
    {
        return $this->buyer->wantedAds()->create([
            'title' => 'Bagremov med, 10 kg',
            'body' => 'Treba mi za zimu, najbolje iz okoline Niša.',
            'category_id' => Category::factory()->create()->id,
            'status' => WantedAd::STATUS_OPEN,
            'expires_at' => now()->addDays(WantedAd::DAYS_OPEN),
        ]);
    }
}
