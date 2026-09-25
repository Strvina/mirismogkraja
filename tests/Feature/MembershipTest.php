<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerSubscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
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
        $this->assertSame('membership.activated', $producer->user->notifications()->latest()->first()->data['type']);

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

        $this->assertSame('membership.ending', $producer->user->notifications()->latest()->first()->data['type']);
        $this->assertNotNull($subscription->refresh()->expiry_warned_at);

        // Running it again the next day must not repeat the warning.
        $this->artisan('memberships:process-expiries');
        $this->assertSame(1, $producer->user->notifications()->count());
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
        $this->assertSame('membership.expired', $producer->user->notifications()->latest()->first()->data['type']);

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
