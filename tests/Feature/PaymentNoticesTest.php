<?php

namespace Tests\Feature;

use App\Models\Boost;
use App\Models\Campaign;
use App\Models\CampaignParticipant;
use App\Models\Producer;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\BoostService;
use App\Services\CancellationService;
use App\Services\SubscriptionService;
use Database\Seeders\RolesSeeder;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Task 154: who is told what when money is involved. The mutation run
 * (.github/workflows/mutation.yml) showed that the admins' notice of a new
 * request could be dropped, or its amount written with decimals, and no
 * test noticed; likewise a gift announced as a payment, and a cancelled
 * campaign place nobody was told about.
 */
class PaymentNoticesTest extends TestCase
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

    /** @return array<string, mixed> */
    private function adminWasTold(string $type): array
    {
        $notification = $this->admin->notifications()->where('data->type', $type)->sole();

        return $notification->data['params'];
    }

    public function test_the_admins_are_told_of_a_membership_request_with_its_amount_and_reference(): void
    {
        $producer = Producer::factory()->active()->create(['name' => 'Pčelarstvo Đorđević']);
        $plan = SubscriptionPlan::where('slug', 'premium')->sole();
        $plan->update(['price_rsd' => 2490]);

        $subscription = app(SubscriptionService::class)->request($producer, $plan);

        $this->assertSame([
            'producer' => 'Pčelarstvo Đorđević',
            'plan' => $plan->name,
            'amount' => '2.490',
            'reference' => $subscription->reference,
        ], $this->adminWasTold('admin.membership-requested'));
    }

    public function test_the_admins_are_told_of_a_boost_request_with_its_amount_and_reference(): void
    {
        $producer = Producer::factory()->active()->create(['name' => 'Pčelarstvo Đorđević']);

        $boost = app(BoostService::class)->request($producer, $producer);

        $this->assertSame([
            'producer' => 'Pčelarstvo Đorđević',
            'name' => 'Pčelarstvo Đorđević',
            'amount' => number_format($boost->amount_rsd, 0, ',', '.'),
            'reference' => $boost->reference,
        ], $this->adminWasTold('admin.boost-requested'));
        $this->assertStringNotContainsString(',', $this->adminWasTold('admin.boost-requested')['amount']);
    }

    public function test_a_membership_given_as_a_gift_is_not_announced_as_paid(): void
    {
        $producer = Producer::factory()->active()->create();

        app(SubscriptionService::class)->grant($producer, SubscriptionPlan::where('slug', 'premium')->sole(), 30);

        $this->assertFalse($producer->user->notifications()->where('data->type', 'membership.activated')->exists());
    }

    public function test_the_producer_is_told_when_a_running_boost_or_campaign_place_is_stopped(): void
    {
        $producer = Producer::factory()->active()->create();
        $paid = ['producer_id' => $producer->id, 'status' => 'active', 'amount_rsd' => 1000];

        $boost = Boost::create([...$paid, 'reference' => '97-1', 'boostable_type' => Boost::PROFILE, 'boostable_id' => $producer->id, 'days' => 7, 'starts_at' => now(), 'ends_at' => now()->addWeek()]);
        $place = CampaignParticipant::create([...$paid, 'reference' => '97-2', 'campaign_id' => Campaign::create([
            'name' => 'Ajvar sezona',
            'slug' => 'ajvar-sezona',
            'starts_on' => today()->subDay(),
            'ends_on' => today()->addWeeks(3),
            'price_rsd' => 2490,
            'is_active' => true,
        ])->id]);

        app(CancellationService::class)->cancel($boost);
        app(CancellationService::class)->cancel($place);

        $told = $producer->user->notifications()->pluck('data')->pluck('type')->all();
        $this->assertContains('boost.cancelled', $told);
        $this->assertContains('campaign.cancelled', $told);
        $this->assertSame(['paid_kind' => 'kampanja', 'anchor' => 'kampanja-'.$place->id], app(CancellationService::class)->adminFields($place));
    }
}
