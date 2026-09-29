<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Boost;
use App\Models\Producer;
use App\Models\ProducerSubscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\BoostService;
use App\Services\CancellationService;
use App\Services\FoundingProducerService;
use App\Services\SubscriptionService;
use Database\Seeders\RolesSeeder;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

    public function test_a_producer_asks_to_cancel_and_the_admin_deactivates(): void
    {
        $producer = Producer::factory()->active()->create();
        $membership = $this->activeMembership($producer);

        $this->actingAs(User::factory()->create())->post(route('cancellation.request', ['clanarina', $membership->id]))->assertForbidden();
        $this->actingAs($producer->user)->post(route('cancellation.request', ['clanarina', $membership->id]))->assertRedirect();
        $this->assertNotNull($membership->refresh()->cancel_requested_at);

        $this->actingAs($this->admin)->get(route('admin.dashboard'))
            ->assertInertia(fn ($page) => $page->where('todo', fn ($todo) => collect($todo)->firstWhere('label', 'zahteva za otkazivanje članarine')['count'] === 1));

        $this->actingAs($this->admin)->patch(route('admin.paid.cancel', ['clanarina', $membership->id]), ['refund_rsd' => 0])->assertRedirect();

        $this->assertSame(ProducerSubscription::STATUS_CANCELLED, $membership->refresh()->status);
        $this->assertNull($membership->refund_rsd);
        $this->assertFalse(app(SubscriptionService::class)->hasFeature($producer, 'statistics'));
        $this->assertContains('membership.cancelled', $producer->user->notifications()->get()->pluck('data.type'));
    }

    /** Only something running can be asked to stop. */
    public function test_an_unpaid_request_cannot_be_asked_to_cancel(): void
    {
        $producer = Producer::factory()->active()->create();
        $pending = app(SubscriptionService::class)->request($producer, SubscriptionPlan::where('slug', 'basic')->sole());

        $this->actingAs($producer->user)->post(route('cancellation.request', ['clanarina', $pending->id]))->assertStatus(422);
    }

    public function test_an_admin_can_deactivate_a_running_boost_without_a_request(): void
    {
        $producer = Producer::factory()->active()->create();
        $boosts = app(BoostService::class);
        $boost = $boosts->confirm($boosts->request($producer, $producer), $this->admin->id);

        $this->actingAs($this->admin)->patch(route('admin.paid.cancel', ['isticanje', $boost->id]))->assertRedirect();

        $this->assertSame(Boost::STATUS_CANCELLED, $boost->refresh()->status);
        $this->assertFalse($boosts->runningIds(Boost::PROFILE)->contains($producer->id));
        $this->assertContains('boost.cancelled', $producer->user->notifications()->get()->pluck('data.type'));
    }

    /** Half the time left, about half the money back - as a suggestion. */
    public function test_the_suggested_refund_is_the_unused_share(): void
    {
        $producer = Producer::factory()->active()->create();
        $boosts = app(BoostService::class);
        $boost = $boosts->confirm($boosts->request($producer, $producer), $this->admin->id);
        $boost->update(['amount_rsd' => 1000, 'starts_at' => now()->subDays(5), 'ends_at' => now()->addDays(5)]);

        $this->assertEqualsWithDelta(500, app(CancellationService::class)->suggestedRefund($boost), 1);

        $boost->update(['status' => Boost::STATUS_EXPIRED]);
        $this->assertSame(0, app(CancellationService::class)->suggestedRefund($boost));
    }

    /**
     * The whole refund: the producer gives an account with the request, the
     * admin decides the amount while deactivating, then marks it sent - and
     * the producer hears at each step. Never more than was paid.
     */
    public function test_a_refund_from_request_to_money_sent(): void
    {
        $producer = Producer::factory()->active()->create();
        $membership = $this->activeMembership($producer);

        $this->actingAs($producer->user)->post(route('cancellation.request', ['clanarina', $membership->id]), ['refund_account' => 'nije račun'])
            ->assertSessionHasErrors('refund_account');
        $this->actingAs($producer->user)->post(route('cancellation.request', ['clanarina', $membership->id]), ['refund_account' => '160-0000000012345-67']);
        $this->assertSame('160-0000000012345-67', $membership->refresh()->refund_account);

        $this->actingAs($this->admin)->patch(route('admin.paid.cancel', ['clanarina', $membership->id]), ['refund_rsd' => $membership->amount_rsd + 1])
            ->assertSessionHasErrors('refund_rsd');
        $this->actingAs($this->admin)->patch(route('admin.paid.cancel', ['clanarina', $membership->id]), ['refund_rsd' => 2000]);

        $this->assertSame(2000, $membership->refresh()->refund_rsd);
        $this->assertContains('refund.decided', $producer->user->notifications()->get()->pluck('data.type'));
        $this->actingAs($this->admin)->get(route('admin.memberships.index', ['status' => 'cancelled']))
            ->assertInertia(fn ($page) => $page->where('counts.refunds_due', 1)->where('subscriptions.data.0.refund.amount', 2000));

        $this->actingAs($this->admin)->patch(route('admin.refunds.paid', ['clanarina', $membership->id]))->assertRedirect();

        $this->assertNotNull($membership->refresh()->refunded_at);
        $this->assertContains('refund.paid', $producer->user->notifications()->get()->pluck('data.type'));
        $this->actingAs($this->admin)->patch(route('admin.refunds.paid', ['clanarina', $membership->id]))->assertStatus(422);
    }

    /** A notification about a payment opens that exact slip or row, not just the list. */
    public function test_payment_notifications_open_what_they_are_about(): void
    {
        $producer = Producer::factory()->active()->create();
        $boosts = app(BoostService::class);
        $boost = $boosts->request($producer, $producer);
        $membership = app(SubscriptionService::class)->request($producer, SubscriptionPlan::where('slug', 'basic')->sole());

        $urls = $producer->user->notifications()->get()->pluck('data.url', 'data.type');

        $this->assertSame(route('boosts.index', ['uplatnica' => $boost->id]), $urls['boost.requested']);
        $this->assertSame(route('memberships.index', ['proizvodjac' => $producer->id, 'uplatnica' => $membership->id]), $urls['membership.requested']);

        $boosts->confirm($boost, $this->admin->id);
        $activated = $producer->user->notifications()->get()->firstWhere('data.type', 'boost.activated');
        $this->assertSame(route('boosts.index').'#isticanje-'.$boost->id, $activated->data['url']);

        // Opened from the bell, a link to one row is a full page load, so the fragment survives.
        $this->actingAs($producer->user)
            ->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request())])
            ->get(route('notifications.open', $activated->id))
            ->assertStatus(409)
            ->assertHeader('X-Inertia-Location', route('boosts.index').'#isticanje-'.$boost->id);
    }

    /** Deactivated without an account on file: the producer is asked for one, and can give it later. */
    public function test_a_producer_gives_the_refund_account_afterwards(): void
    {
        $producer = Producer::factory()->active()->create();
        $boosts = app(BoostService::class);
        $boost = $boosts->confirm($boosts->request($producer, $producer), $this->admin->id);

        $this->actingAs($this->admin)->patch(route('admin.paid.cancel', ['isticanje', $boost->id]), ['refund_rsd' => 300]);
        $this->assertContains('refund.needs-account', $producer->user->notifications()->get()->pluck('data.type'));

        $this->actingAs(User::factory()->create())->put(route('refunds.account', ['isticanje', $boost->id]), ['refund_account' => '160000000001234567'])
            ->assertForbidden();
        $this->actingAs($producer->user)->put(route('refunds.account', ['isticanje', $boost->id]), ['refund_account' => '160000000001234567'])
            ->assertRedirect();

        $this->assertSame('160000000001234567', $boost->refresh()->refund_account);
        $this->assertContains('admin.refund-account', $this->admin->notifications()->get()->pluck('data.type'));
    }
}
