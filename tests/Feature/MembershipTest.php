<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerSubscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\CancellationService;
use App\Services\SubscriptionService;
use Database\Seeders\RolesSeeder;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Task 20.1: a yearly membership paid by bank slip. Nothing here talks to a
 * payment provider - a producer asks for a plan, gets a reference to write
 * on the slip, and an admin confirms when the money arrives.
 */
class MembershipTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SubscriptionPlansSeeder::class);
    }

    private function admin(): User
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        return $admin;
    }

    private function plan(string $slug): SubscriptionPlan
    {
        return SubscriptionPlan::where('slug', $slug)->sole();
    }

    public function test_choosing_a_plan_creates_a_payment_reference_not_a_charge(): void
    {
        $producer = Producer::factory()->active()->create();
        $premium = $this->plan('premium');

        $this->actingAs($producer->user)
            ->post(route('memberships.store'), ['producer_id' => $producer->id, 'plan_id' => $premium->id])
            ->assertRedirect();

        $subscription = ProducerSubscription::sole();
        $this->assertSame(ProducerSubscription::STATUS_PENDING, $subscription->status);
        $this->assertSame($premium->price_rsd, $subscription->amount_rsd);
        $this->assertNotEmpty($subscription->reference);
        $this->assertNull($subscription->starts_at);
    }

    /** The queue holds one line per producer, not one per click. */
    public function test_choosing_again_before_paying_replaces_the_request(): void
    {
        $producer = Producer::factory()->active()->create();

        $this->actingAs($producer->user)->post(route('memberships.store'), [
            'producer_id' => $producer->id, 'plan_id' => $this->plan('premium')->id,
        ]);
        $this->actingAs($producer->user)->post(route('memberships.store'), [
            'producer_id' => $producer->id, 'plan_id' => $this->plan('pro')->id,
        ]);

        $this->assertSame(1, ProducerSubscription::count());
        $this->assertSame($this->plan('pro')->price_rsd, ProducerSubscription::sole()->amount_rsd);
    }

    public function test_a_stranger_cannot_order_a_plan_for_someone_elses_producer(): void
    {
        $producer = Producer::factory()->active()->create();

        $this->actingAs(User::factory()->create())->post(route('memberships.store'), [
            'producer_id' => $producer->id, 'plan_id' => $this->plan('basic')->id,
        ])->assertForbidden();

        $this->assertSame(0, ProducerSubscription::count());
    }

    public function test_confirming_payment_activates_the_membership_and_tells_the_producer(): void
    {
        $producer = Producer::factory()->active()->create();
        $this->actingAs($producer->user)->post(route('memberships.store'), [
            'producer_id' => $producer->id, 'plan_id' => $this->plan('premium')->id,
        ]);

        $this->actingAs($this->admin())
            ->patch(route('admin.memberships.confirm', ProducerSubscription::sole()))
            ->assertRedirect();

        $subscription = ProducerSubscription::sole();
        $this->assertSame(ProducerSubscription::STATUS_ACTIVE, $subscription->status);
        $this->assertTrue($subscription->ends_at->isFuture());
        $this->assertContains('membership.activated', $producer->user->notifications()->get()->pluck('data.type'));

        // The plan's features now apply.
        $this->assertTrue(app(SubscriptionService::class)->hasFeature($producer->refresh(), 'statistics'));
    }

    /** Paying early must not throw away days already paid for. */
    public function test_a_renewal_starts_where_the_current_membership_ends(): void
    {
        $producer = Producer::factory()->active()->create();
        $subscriptions = app(SubscriptionService::class);
        $admin = $this->admin();

        $first = $subscriptions->request($producer, $this->plan('basic'));
        $subscriptions->confirmPayment($first, $admin->id);
        $firstEnd = $first->refresh()->ends_at;

        $second = $subscriptions->request($producer->refresh(), $this->plan('basic'));
        $subscriptions->confirmPayment($second, $admin->id);

        $this->assertTrue($second->refresh()->starts_at->equalTo($firstEnd));
        $this->assertTrue($second->ends_at->greaterThan($firstEnd));
    }

    /** An upgrade is in force at once, and the rest of the lower plan runs after it. */
    public function test_an_upgrade_starts_now_and_the_lower_plan_resumes_after_it(): void
    {
        $this->travelTo(now()->startOfDay());
        $producer = Producer::factory()->active()->create();
        $subscriptions = app(SubscriptionService::class);

        $basic = $subscriptions->request($producer, $this->plan('basic'));
        $subscriptions->confirmPayment($basic, null);

        // A hundred days in, with 265 of Basic left, they pay for Premium.
        $this->travelTo(now()->addDays(100));
        $premium = $subscriptions->request($producer, $this->plan('premium'));
        $subscriptions->confirmPayment($premium, null);

        $premium->refresh();
        $basic->refresh();

        $this->assertTrue($premium->starts_at->equalTo(now()));
        $this->assertTrue($premium->ends_at->equalTo(now()->addDays(365)));
        $this->assertTrue($basic->starts_at->equalTo($premium->ends_at));
        $this->assertEquals(265, $basic->starts_at->diffInDays($basic->ends_at));

        $this->assertSame('premium', $subscriptions->planFor($producer)->slug);
        $this->assertTrue($subscriptions->hasFeature($producer, 'statistics'));

        $this->actingAs($producer->user)->get(route('memberships.index'))->assertInertia(fn ($page) => $page
            ->where('producers.0.current_plan.name', 'Premium')
            ->where('producers.0.active.id', $premium->id)
            ->has('producers.0.upcoming', 1)
            ->where('producers.0.upcoming.0.plan', 'Basic'));

        // Once Premium has run its year, Basic is back in force - without its benefits.
        $this->travelTo($premium->ends_at->copy()->addDay());
        $subscriptions->processExpiries();

        $fresh = app(SubscriptionService::class);
        $this->assertSame('basic', $fresh->planFor($producer)->slug);
        $this->assertFalse($fresh->hasFeature($producer, 'statistics'));
        $this->assertTrue($basic->refresh()->isRunning());
    }

    /** An upgrade stopped half-way must not leave the producer with no plan while a paid one waits. */
    public function test_cancelling_an_upgrade_brings_the_plan_behind_it_back_at_once(): void
    {
        $this->travelTo(now()->startOfDay());
        $producer = Producer::factory()->active()->create();
        $subscriptions = app(SubscriptionService::class);

        $basic = $subscriptions->request($producer, $this->plan('basic'));
        $subscriptions->confirmPayment($basic, null);
        $this->travelTo(now()->addDays(100));
        $premium = $subscriptions->request($producer, $this->plan('premium'));
        $subscriptions->confirmPayment($premium, null);

        // Twenty days into Premium, an admin stops it.
        $this->travelTo(now()->addDays(20));
        app(CancellationService::class)->cancel($premium->refresh());

        $basic->refresh();
        $this->assertTrue($basic->isRunning());
        // The 265 days Basic had left when Premium took over are still all there.
        $this->assertTrue($basic->starts_at->equalTo(now()));
        $this->assertTrue($basic->ends_at->equalTo(now()->addDays(265)));
        $this->assertSame('basic', app(SubscriptionService::class)->planFor($producer)->slug);
        $this->assertFalse(app(SubscriptionService::class)->hasFeature($producer, 'statistics'));
    }

    /** A lower plan bought during a higher one waits its turn, and gives nothing away meanwhile. */
    public function test_a_downgrade_waits_for_the_higher_plan_to_end(): void
    {
        $producer = Producer::factory()->active()->create();
        $subscriptions = app(SubscriptionService::class);

        $pro = $subscriptions->request($producer, $this->plan('pro'));
        $subscriptions->confirmPayment($pro, null);
        $basic = $subscriptions->request($producer, $this->plan('basic'));
        $subscriptions->confirmPayment($basic, null);

        $this->assertTrue($basic->refresh()->starts_at->equalTo($pro->refresh()->ends_at));
        $this->assertFalse($basic->isRunning());
        // The plan in force, not the one with the furthest end date.
        $this->assertSame('pro', $subscriptions->planFor($producer)->slug);
        $this->assertTrue($subscriptions->hasFeature($producer, 'homepage'));
    }

    /** Pro on top of Premium on top of Basic: each lower one moves back, in order. */
    public function test_everything_lower_moves_back_by_the_length_of_the_upgrade(): void
    {
        $this->travelTo(now()->startOfDay());
        $producer = Producer::factory()->active()->create();
        $subscriptions = app(SubscriptionService::class);

        $premium = $subscriptions->request($producer, $this->plan('premium'));
        $subscriptions->confirmPayment($premium, null);
        $basic = $subscriptions->request($producer, $this->plan('basic'));
        $subscriptions->confirmPayment($basic, null);

        // A month of Premium as a gift, the way a referral rewards it: same
        // plan, so it queues behind the paid year and ahead of Basic.
        $gift = $subscriptions->grant($producer, $this->plan('premium'), 30);

        $this->assertTrue($gift->refresh()->starts_at->equalTo(now()->addDays(365)));
        $this->assertTrue($basic->refresh()->starts_at->equalTo(now()->addDays(395)));
        $this->assertTrue($basic->ends_at->equalTo(now()->addDays(760)));

        $pro = $subscriptions->request($producer, $this->plan('pro'));
        $subscriptions->confirmPayment($pro, null);

        $this->assertTrue($pro->refresh()->starts_at->equalTo(now()));
        $this->assertTrue($premium->refresh()->starts_at->equalTo(now()->addDays(365)));
        $this->assertTrue($premium->ends_at->equalTo(now()->addDays(730)));
        $this->assertTrue($gift->refresh()->starts_at->equalTo(now()->addDays(730)));
        $this->assertTrue($basic->refresh()->starts_at->equalTo(now()->addDays(760)));
        $this->assertSame('pro', $subscriptions->planFor($producer)->slug);
    }

    public function test_only_an_admin_can_confirm_a_payment(): void
    {
        $this->seed(RolesSeeder::class);
        $producer = Producer::factory()->active()->create();
        $subscription = app(SubscriptionService::class)->request($producer, $this->plan('basic'));

        $this->actingAs($producer->user)->patch(route('admin.memberships.confirm', $subscription))->assertForbidden();
        $this->assertSame(ProducerSubscription::STATUS_PENDING, $subscription->refresh()->status);
    }

    public function test_a_producer_without_a_membership_gets_the_base_plan_only(): void
    {
        $producer = Producer::factory()->active()->create();
        $subscriptions = app(SubscriptionService::class);

        $this->assertSame('Basic', $subscriptions->planFor($producer)->name);
        $this->assertFalse($subscriptions->hasFeature($producer, 'statistics'));
    }

    public function test_the_producer_is_warned_before_the_membership_runs_out(): void
    {
        $producer = Producer::factory()->active()->create();
        $subscription = app(SubscriptionService::class)->request($producer, $this->plan('premium'));
        $subscription->update([
            'status' => ProducerSubscription::STATUS_ACTIVE,
            'starts_at' => now()->subYear(),
            'ends_at' => now()->addDays(5),
        ]);

        $this->artisan('memberships:process-expiries')->assertSuccessful();

        $this->assertContains('membership.ending', $producer->user->notifications()->get()->pluck('data.type'));
        $this->assertNotNull($subscription->refresh()->expiry_warned_at);

        // Running it again the next day must not repeat the warning.
        $this->artisan('memberships:process-expiries');
        $this->assertSame(1, $producer->user->notifications()->get()->where('data.type', 'membership.ending')->count());
    }

    public function test_an_ended_membership_closes_and_the_profile_stays_online(): void
    {
        $producer = Producer::factory()->active()->create();
        $subscription = app(SubscriptionService::class)->request($producer, $this->plan('pro'));
        $subscription->update([
            'status' => ProducerSubscription::STATUS_ACTIVE,
            'starts_at' => now()->subYear(),
            'ends_at' => now()->subDay(),
        ]);

        $this->artisan('memberships:process-expiries');

        $this->assertSame(ProducerSubscription::STATUS_EXPIRED, $subscription->refresh()->status);
        $this->assertContains('membership.expired', $producer->user->notifications()->get()->pluck('data.type'));

        // Back to the free floor, but still listed and still visible.
        $subscriptions = app(SubscriptionService::class);
        $this->assertSame('Basic', $subscriptions->planFor($producer->refresh())->name);
        $this->assertFalse($subscriptions->hasFeature($producer, 'homepage'));
        $this->get(route('marketplace.producers.show', $producer->slug))->assertOk();
    }

    public function test_an_admin_can_change_a_plans_price(): void
    {
        $plan = $this->plan('premium');

        $this->actingAs($this->admin())->put(route('admin.plans.update', $plan), [
            'name' => 'Premium',
            'description' => 'Izmenjen opis',
            'price_rsd' => 7490,
            'duration_days' => 365,
            'is_active' => true,
            'features' => ['statistics'],
        ])->assertRedirect();

        $plan->refresh();
        $this->assertSame(7490, $plan->price_rsd);
        $this->assertSame(['statistics'], $plan->features);
    }
}
