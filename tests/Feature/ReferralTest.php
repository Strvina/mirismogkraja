<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerSubscription;
use App\Models\Referral;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\ReferralService;
use App\Services\SubscriptionService;
use Database\Seeders\RolesSeeder;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/** "Preporuči proizvođača". */
class ReferralTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([RolesSeeder::class, SubscriptionPlansSeeder::class]);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        // No founding places, so the only free Premium in these tests is the
        // referral's.
        config(['platform.founding_limit' => 0]);
    }

    private function referrer(array $attributes = []): Producer
    {
        $producer = Producer::factory()->active()->create(['name' => 'Pčelarstvo Ilić', ...$attributes]);
        app(ReferralService::class)->codeFor($producer);

        return $producer->refresh();
    }

    /** Open the referrer's link, then register through it; returns the new account. */
    private function registerThrough(Producer $referrer, string $email = 'nova@example.com'): User
    {
        $cookie = $this->get(route('referrals.visit', $referrer->referral_code))
            ->assertRedirect(route('register'))
            ->getCookie(ReferralService::COOKIE);

        $this->withCookie(ReferralService::COOKIE, $cookie->getValue())->post(route('register'), [
            'name' => 'Nova Proizvođačica',
            'email' => $email,
            'password' => 'lozinka-koja-vazi-123',
            'password_confirmation' => 'lozinka-koja-vazi-123',
        ])->assertSessionHasNoErrors();

        // Registering signs the new account in; the next visitor is someone else.
        $this->app['auth']->forgetGuards();
        $this->flushSession();

        return User::where('email', $email)->sole();
    }

    private function approve(Producer $producer): void
    {
        $this->actingAs($this->admin)->patch(route('admin.producers.status', $producer), ['status' => 'active'])->assertRedirect();
        $this->app['auth']->forgetGuards();
    }

    private function premiumUntil(Producer $producer): ?Carbon
    {
        $endsAt = $producer->subscriptions()->active()->max('ends_at');

        return $endsAt ? Carbon::parse($endsAt) : null;
    }

    public function test_the_link_is_remembered_and_the_referral_is_written_at_sign_up(): void
    {
        $referrer = $this->referrer();

        $cookie = $this->get(route('referrals.visit', $referrer->referral_code))->getCookie(ReferralService::COOKIE);
        $this->assertSame($referrer->referral_code, $cookie->getValue());

        // The sign-up page says whose link it was.
        $this->withCookie(ReferralService::COOKIE, $cookie->getValue())->get(route('register'))
            ->assertInertia(fn ($page) => $page->where('referrer', 'Pčelarstvo Ilić'));

        $newcomer = $this->registerThrough($referrer);

        $referral = Referral::sole();
        $this->assertSame($referrer->id, $referral->referrer_producer_id);
        $this->assertSame($newcomer->id, $referral->referred_user_id);
        $this->assertSame(Referral::STATUS_PENDING, $referral->status);

        // Nothing is given for an account alone.
        $this->assertNull($this->premiumUntil($referrer));
    }

    public function test_both_get_a_month_of_premium_when_the_new_producer_is_approved(): void
    {
        $referrer = $this->referrer();
        $newcomer = $this->registerThrough($referrer);
        $newProducer = Producer::factory()->for($newcomer)->create(['name' => 'Sirana Petrović', 'status' => 'pending']);

        $this->actingAs($this->admin)->get(route('admin.producers.index'))
            ->assertInertia(fn ($page) => $page->where('producers.data.0.referred_by', 'Pčelarstvo Ilić'));

        $this->approve($newProducer);

        $referral = Referral::sole();
        $this->assertSame(Referral::STATUS_REWARDED, $referral->status);
        $this->assertSame($newProducer->id, $referral->referred_producer_id);
        $this->assertNotNull($referral->rewarded_at);

        foreach ([$referrer, $newProducer] as $producer) {
            $this->assertEqualsWithDelta(now()->addDays(ReferralService::REWARD_DAYS)->timestamp, $this->premiumUntil($producer)->timestamp, 5);
            // A gift, recorded like the founding year: nothing to pay.
            $this->assertSame(0, (int) $producer->subscriptions()->sole()->amount_rsd);
        }

        $this->assertContains('referral.rewarded', $referrer->user->notifications()->get()->pluck('data.type')->all());
        $this->assertContains('referral.welcome', $newcomer->notifications()->get()->pluck('data.type')->all());
    }

    public function test_the_month_is_added_after_a_membership_already_running(): void
    {
        $referrer = $this->referrer();
        $paid = app(SubscriptionService::class)->grant($referrer, SubscriptionPlan::where('slug', 'premium')->sole(), 100);

        $newcomer = $this->registerThrough($referrer);
        $this->approve(Producer::factory()->for($newcomer)->create(['status' => 'pending']));

        $this->assertEqualsWithDelta(
            $paid->ends_at->copy()->addDays(ReferralService::REWARD_DAYS)->timestamp,
            $this->premiumUntil($referrer)->timestamp,
            5,
        );
    }

    public function test_an_account_earns_for_its_referrer_once(): void
    {
        $referrer = $this->referrer();
        $newcomer = $this->registerThrough($referrer);
        $first = Producer::factory()->for($newcomer)->create(['status' => 'pending']);
        $second = Producer::factory()->for($newcomer)->create(['status' => 'pending']);

        $this->approve($first);
        $this->approve($second);

        // Blocked and approved again: the reward belongs to the first approval.
        $this->actingAs($this->admin)->patch(route('admin.producers.status', $first), ['status' => 'blocked']);
        $this->approve($first);

        $this->assertSame(1, Referral::count());
        $this->assertSame(1, $referrer->subscriptions()->count());
        $this->assertSame(1, $first->subscriptions()->count());
        $this->assertSame(0, $second->subscriptions()->count());
    }

    public function test_an_existing_account_cannot_be_referred(): void
    {
        $referrer = $this->referrer();
        $existing = User::factory()->create();

        $this->actingAs($existing)->get(route('referrals.visit', $referrer->referral_code))
            ->assertRedirect(route('marketplace.producers.show', $referrer->slug))
            ->assertCookieMissing(ReferralService::COOKIE);

        $this->approve(Producer::factory()->for($existing)->create(['status' => 'pending']));

        $this->assertSame(0, Referral::count());
        $this->assertNull($this->premiumUntil($referrer));
    }

    public function test_an_unknown_code_or_an_unapproved_producers_code_refers_nobody(): void
    {
        $pending = Producer::factory()->create(['status' => 'pending', 'referral_code' => 'abcd1234']);

        foreach (['abcd1234', 'nepoznat', "x' or 1=1"] as $code) {
            $this->get('/preporuka/'.rawurlencode($code))
                ->assertRedirect(route('register'))
                ->assertCookieMissing(ReferralService::COOKIE);
        }

        // A cookie forged by hand is worth as much as the code in it.
        $this->withCookie(ReferralService::COOKIE, 'abcd1234')->post(route('register'), [
            'name' => 'Neko', 'email' => 'neko@example.com', 'password' => 'lozinka-koja-vazi-123', 'password_confirmation' => 'lozinka-koja-vazi-123',
        ]);

        $this->assertSame(0, Referral::count());
        $this->assertNotNull($pending);
    }

    public function test_the_same_person_under_two_accounts_earns_nothing(): void
    {
        $referrer = $this->referrer(['phone' => '+381 64 123 4567']);
        $newcomer = $this->registerThrough($referrer);
        $newProducer = Producer::factory()->for($newcomer)->create(['status' => 'pending', 'phone' => '064/123-4567']);

        $this->approve($newProducer);

        $this->assertSame(Referral::STATUS_SAME_PERSON, Referral::sole()->status);
        $this->assertNull($this->premiumUntil($referrer));
        $this->assertNull($this->premiumUntil($newProducer));
    }

    public function test_a_referrer_earns_a_limited_number_of_months_a_year(): void
    {
        $referrer = $this->referrer();

        foreach (range(1, ReferralService::MAX_REWARDS_PER_YEAR) as $ignored) {
            Referral::create([
                'referrer_producer_id' => $referrer->id,
                'referred_user_id' => User::factory()->create()->id,
                'status' => Referral::STATUS_REWARDED,
                'rewarded_at' => now()->subMonth(),
            ]);
        }

        $newcomer = $this->registerThrough($referrer);
        $this->approve(Producer::factory()->for($newcomer)->create(['status' => 'pending']));

        $this->assertSame(Referral::STATUS_CAP_REACHED, Referral::where('referred_user_id', $newcomer->id)->sole()->status);
        $this->assertNull($this->premiumUntil($referrer));
    }

    public function test_a_referral_does_not_wait_forever_and_needs_the_referrer_still_there(): void
    {
        $referrer = $this->referrer();
        $late = $this->registerThrough($referrer, 'kasni@example.com');

        $this->travel(ReferralService::REWARD_WINDOW_DAYS + 1)->days();
        $this->approve(Producer::factory()->for($late)->create(['status' => 'pending']));
        $this->assertSame(Referral::STATUS_EXPIRED, Referral::where('referred_user_id', $late->id)->sole()->status);

        $orphan = $this->registerThrough($referrer, 'bez-preporucioca@example.com');
        $referrer->update(['status' => 'blocked']);
        $this->approve(Producer::factory()->for($orphan)->create(['status' => 'pending']));
        $this->assertSame(Referral::STATUS_REFERRER_INACTIVE, Referral::where('referred_user_id', $orphan->id)->sole()->status);

        $this->assertSame(0, ProducerSubscription::count());
    }

    public function test_the_producer_sees_their_link_and_what_came_of_it(): void
    {
        $referrer = $this->referrer();
        $newcomer = $this->registerThrough($referrer);
        $pending = Producer::factory()->create(['status' => 'pending']);

        $this->actingAs($referrer->user)->get(route('producers.referrals.index', $referrer))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('producers/referrals')
                ->where('link', route('referrals.visit', $referrer->referral_code))
                ->has('referrals', 1)
                ->where('referrals.0.status', 'pending')
                // The account behind it is nobody's business but the admin's.
                ->missing('referrals.0.email')
                ->where('rules.usedThisYear', 0));

        // No link before approval, and no code spent on one.
        $this->actingAs($pending->user)->get(route('producers.referrals.index', $pending))
            ->assertInertia(fn ($page) => $page->where('link', null));
        $this->assertNull($pending->refresh()->referral_code);

        $this->actingAs(User::factory()->create())->get(route('producers.referrals.index', $referrer))->assertForbidden();
    }

    public function test_only_admins_see_who_referred_whom(): void
    {
        $referrer = $this->referrer();
        $newcomer = $this->registerThrough($referrer);

        $this->actingAs($referrer->user)->get(route('admin.referrals.index'))->assertForbidden();

        $this->actingAs($this->admin)->get(route('admin.referrals.index', ['status' => 'pending']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/referrals/index')
                ->where('referrals.data.0.referrer.name', 'Pčelarstvo Ilić')
                ->where('referrals.data.0.user.email', $newcomer->email));
    }
}
