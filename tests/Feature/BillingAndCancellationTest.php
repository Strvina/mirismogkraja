<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Boost;
use App\Models\Producer;
use App\Models\ProducerSubscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\BoostService;
use App\Services\FoundingProducerService;
use App\Services\SubscriptionService;
use Database\Seeders\RolesSeeder;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/** Prices on a settings tab of their own; stopping what was paid for, and refunds. */
class BillingAndCancellationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([RolesSeeder::class, SubscriptionPlansSeeder::class]);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
    }

    private function activeMembership(Producer $producer): ProducerSubscription
    {
        $subscriptions = app(SubscriptionService::class);

        return $subscriptions->confirmPayment($subscriptions->request($producer, SubscriptionPlan::where('slug', 'premium')->sole()), $this->admin->id);
    }

    public function test_settings_load_only_on_their_own_tab(): void
    {
        $this->actingAs($this->admin)->get(route('admin.memberships.index', ['status' => 'settings']))->assertInertia(fn ($page) => $page
            ->has('settings.plans', 3)
            ->has('settings.payment.account')
            ->where('settings.founding.limit', 50)
            ->where('subscriptions', null));
        $this->actingAs($this->admin)->get(route('admin.boosts.index', ['status' => 'settings']))
            ->assertInertia(fn ($page) => $page->where('terms.days', 7)->where('boosts', null));

        $this->actingAs($this->admin)->get(route('admin.memberships.index', ['status' => 'active']))
            ->assertInertia(fn ($page) => $page->where('settings', null)->has('subscriptions.data'));
        $this->actingAs($this->admin)->get(route('admin.boosts.index', ['status' => 'expired']))
            ->assertInertia(fn ($page) => $page->where('terms', null));
        $this->actingAs($this->admin)->get(route('admin.campaigns.index', ['status' => 'ended']))
            ->assertInertia(fn ($page) => $page->where('campaigns', null)->has('places.data'));
    }

    public function test_the_founding_limit_is_a_setting_never_below_what_was_given(): void
    {
        Producer::factory()->active()->create(['founding_number' => 12]);

        $this->actingAs($this->admin)->put(route('admin.founding.update'), ['limit' => 10])->assertSessionHasErrors('limit');
        $this->actingAs($this->admin)->put(route('admin.founding.update'), ['limit' => 30])->assertSessionHasNoErrors();

        $this->assertSame(30, app(FoundingProducerService::class)->limit());
        $this->get('/prvih-100')->assertRedirect('/osnivaci');
    }

    public function test_an_admin_deactivates_a_running_membership(): void
    {
        $producer = Producer::factory()->active()->create();
        $membership = $this->activeMembership($producer);

        $this->actingAs($producer->user)->patch(route('admin.paid.cancel', ['clanarina', $membership->id]))->assertForbidden();
        $this->actingAs($this->admin)->patch(route('admin.paid.cancel', ['clanarina', $membership->id]))->assertRedirect();

        $this->assertSame(ProducerSubscription::STATUS_CANCELLED, $membership->refresh()->status);
        $this->assertFalse(app(SubscriptionService::class)->hasFeature($producer, 'statistics'));
        $this->assertContains('membership.cancelled', $producer->user->notifications()->get()->pluck('data.type'));

        // Already cancelled: nothing left to stop.
        $this->actingAs($this->admin)->patch(route('admin.paid.cancel', ['clanarina', $membership->id]))->assertStatus(422);
    }

    public function test_an_admin_deactivates_a_running_boost(): void
    {
        $producer = Producer::factory()->active()->create();
        $boosts = app(BoostService::class);
        $boost = $boosts->confirm($boosts->request($producer, $producer), $this->admin->id);

        $this->actingAs($this->admin)->patch(route('admin.paid.cancel', ['isticanje', $boost->id]))->assertRedirect();

        $this->assertSame(Boost::STATUS_CANCELLED, $boost->refresh()->status);
        $this->assertFalse($boosts->runningIds(Boost::PROFILE)->contains($producer->id));
        $this->assertContains('boost.cancelled', $producer->user->notifications()->get()->pluck('data.type'));
    }

    /** A notification about a payment opens that exact slip or row, not just the list. */
    public function test_payment_notifications_open_what_they_are_about(): void
    {
        $producer = Producer::factory()->active()->create();
        $boosts = app(BoostService::class);
        $boost = $boosts->request($producer, $producer);
        $membership = app(SubscriptionService::class)->request($producer, SubscriptionPlan::where('slug', 'basic')->sole());

        $urls = $producer->user->notifications()->get()->pluck('data.url', 'data.type');

        $this->assertSame(route('boosts.index', ['uplatnica' => $boost->id], false), $urls['boost.requested']);
        $this->assertSame(route('memberships.index', ['proizvodjac' => $producer->id, 'uplatnica' => $membership->id], false), $urls['membership.requested']);

        $boosts->confirm($boost, $this->admin->id);
        $activated = $producer->user->notifications()->get()->firstWhere('data.type', 'boost.activated');
        $this->assertSame('/isticanje#isticanje-'.$boost->id, $activated->data['url']);

        // Opened from the bell, a link to one row is a full page load, so the fragment survives.
        $this->actingAs($producer->user)
            ->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request())])
            ->get(route('notifications.open', $activated->id))
            ->assertStatus(409)
            ->assertHeader('X-Inertia-Location', route('boosts.index').'#isticanje-'.$boost->id);
    }

    /**
     * A notification written with another host - APP_URL from a scheduled
     * command, or an old domain - still opens on the host in use.
     */
    public function test_a_notification_link_opens_on_the_current_host(): void
    {
        $producer = Producer::factory()->active()->create();
        $notification = $producer->user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => 'legacy',
            'data' => ['type' => 'boost.activated', 'params' => [], 'url' => 'http://some-other-host/isticanje#isticanje-2'],
        ]);

        $this->actingAs($producer->user)->get(route('notifications.open', $notification->id))
            ->assertRedirect(url('/isticanje').'#isticanje-2');
    }
}
