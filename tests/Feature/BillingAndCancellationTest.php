<?php

namespace Tests\Feature;

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
use Tests\TestCase;

/** Prices on a page of their own; stopping what was paid for. */
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

    public function test_prices_live_on_the_billing_page_not_on_every_queue_tab(): void
    {
        $this->actingAs($this->admin)->get(route('admin.billing.index'))->assertInertia(fn ($page) => $page
            ->has('plans', 3)
            ->where('boostTerms.days', 7)
            ->has('payment.account')
            ->where('founding.limit', 50));

        $this->actingAs($this->admin)->get(route('admin.memberships.index', ['status' => 'active']))
            ->assertInertia(fn ($page) => $page->missing('plans')->missing('payment')->missing('revenue'));
        $this->actingAs($this->admin)->get(route('admin.boosts.index', ['status' => 'expired']))
            ->assertInertia(fn ($page) => $page->missing('terms'));
    }

    public function test_the_founding_limit_is_a_setting_never_below_what_was_given(): void
    {
        Producer::factory()->active()->create(['founding_number' => 12]);

        $this->actingAs($this->admin)->put(route('admin.billing.founding'), ['limit' => 10])->assertSessionHasErrors('limit');
        $this->actingAs($this->admin)->put(route('admin.billing.founding'), ['limit' => 30])->assertSessionHasNoErrors();

        $this->assertSame(30, app(FoundingProducerService::class)->limit());
        $this->get('/prvih-100')->assertRedirect('/osnivaci');
    }

    public function test_a_producer_asks_to_cancel_and_the_admin_deactivates(): void
    {
        $producer = Producer::factory()->active()->create();
        $membership = $this->activeMembership($producer);

        $this->actingAs(User::factory()->create())->post(route('cancellation.membership', $membership))->assertForbidden();
        $this->actingAs($producer->user)->post(route('cancellation.membership', $membership))->assertRedirect();
        $this->assertNotNull($membership->refresh()->cancel_requested_at);

        $this->actingAs($this->admin)->get(route('admin.dashboard'))
            ->assertInertia(fn ($page) => $page->where('todo', fn ($todo) => collect($todo)->firstWhere('label', 'zahteva za otkazivanje članarine')['count'] === 1));

        $this->actingAs($this->admin)->patch(route('admin.memberships.cancel', $membership))->assertRedirect();

        $this->assertSame(ProducerSubscription::STATUS_CANCELLED, $membership->refresh()->status);
        $this->assertFalse(app(SubscriptionService::class)->hasFeature($producer, 'statistics'));
        $this->assertContains('membership.cancelled', $producer->user->notifications()->get()->pluck('data.type'));
    }

    /** Only something running can be asked to stop. */
    public function test_an_unpaid_request_cannot_be_asked_to_cancel(): void
    {
        $producer = Producer::factory()->active()->create();
        $pending = app(SubscriptionService::class)->request($producer, SubscriptionPlan::where('slug', 'basic')->sole());

        $this->actingAs($producer->user)->post(route('cancellation.membership', $pending))->assertStatus(422);
    }

    public function test_an_admin_can_deactivate_a_running_boost_without_a_request(): void
    {
        $producer = Producer::factory()->active()->create();
        $boosts = app(BoostService::class);
        $boost = $boosts->confirm($boosts->request($producer, $producer), $this->admin->id);

        $this->actingAs($this->admin)->patch(route('admin.boosts.cancel', $boost))->assertRedirect();

        $this->assertSame(Boost::STATUS_CANCELLED, $boost->refresh()->status);
        $this->assertFalse($boosts->runningIds(Boost::PROFILE)->contains($producer->id));
        $this->assertContains('boost.cancelled', $producer->user->notifications()->get()->pluck('data.type'));
    }
}
