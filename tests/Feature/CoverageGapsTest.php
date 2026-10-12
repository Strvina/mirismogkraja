<?php

namespace Tests\Feature;

use App\Models\Boost;
use App\Models\Campaign;
use App\Models\CampaignParticipant;
use App\Models\Producer;
use App\Models\ProducerSubscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\BoostService;
use App\Services\CancellationService;
use App\Services\CategoryService;
use App\Services\PaymentSlipService;
use App\Services\ProducerPosterPdf;
use App\Services\SubscriptionService;
use App\Services\TwoFactor;
use App\Support\Media;
use App\Support\PaidItems;
use Database\Seeders\RolesSeeder;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;
use RuntimeException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Tests\TestCase;

/**
 * Task 154: the branches of app/Services and app/Support that the coverage
 * run (.github/workflows/coverage.yml) showed no test reached, where the
 * branch is a decision and not a guard. Each is something that goes wrong
 * rarely and matters when it does.
 */
class CoverageGapsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([RolesSeeder::class, SubscriptionPlansSeeder::class]);
    }

    /** Every mail from here on fails, as with a mail server that is down. */
    private function mailServerIsDown(): void
    {
        Mail::extend('down', fn () => new class extends AbstractTransport
        {
            protected function doSend(SentMessage $message): void
            {
                throw new RuntimeException('Connection refused');
            }

            public function __toString(): string
            {
                return 'down://';
            }
        });

        config(['mail.default' => 'down', 'mail.mailers.down' => ['transport' => 'down']]);
        Mail::forgetMailers();
        Exceptions::fake();
    }

    public function test_a_mail_server_that_is_down_does_not_stop_the_membership_warnings(): void
    {
        $plan = SubscriptionPlan::where('slug', 'premium')->sole();
        $producers = Producer::factory()->active()->count(2)->create();
        $producers->each(fn (Producer $producer) => app(SubscriptionService::class)->grant($producer, $plan, ProducerSubscription::WARN_DAYS_BEFORE - 1));
        $this->mailServerIsDown();

        $result = app(SubscriptionService::class)->processExpiries();

        // Both were told on the site and marked as told, so tomorrow's run
        // does not warn them again.
        $this->assertSame(2, $result['warned']);
        $this->assertSame(0, ProducerSubscription::whereNull('expiry_warned_at')->count());
        $producers->each(fn (Producer $producer) => $this->assertTrue($producer->user->notifications()->where('data->type', 'membership.ending')->exists()));
        Exceptions::assertReportedCount(2);
    }

    public function test_a_mail_server_that_is_down_does_not_stop_the_boost_warnings(): void
    {
        $producers = Producer::factory()->active()->count(2)->create();
        $producers->each(fn (Producer $producer) => Boost::create([
            'producer_id' => $producer->id,
            'boostable_type' => Boost::PROFILE,
            'boostable_id' => $producer->id,
            'status' => Boost::STATUS_ACTIVE,
            'reference' => "97-{$producer->id}",
            'amount_rsd' => 1000,
            'days' => 7,
            'starts_at' => now()->subDays(6),
            'ends_at' => now()->addHours(12),
        ]));
        $this->mailServerIsDown();

        $this->assertSame(2, app(BoostService::class)->warnEnding());

        $this->assertSame(0, Boost::whereNull('ending_warned_at')->count());
        $producers->each(fn (Producer $producer) => $this->assertTrue($producer->user->notifications()->where('data->type', 'boost.ending')->exists()));
        Exceptions::assertReportedCount(2);
    }

    public function test_google_ends_the_sessions_of_whoever_opened_the_account_before_its_owner(): void
    {
        config(['services.google.client_id' => 'test-client', 'services.google.client_secret' => 'test-secret', 'session.driver' => 'database']);
        // Registered with someone else's address and never confirmed, and
        // still signed in on the stranger's device.
        $squatted = User::factory()->unverified()->create(['email' => 'milica@example.com']);
        $someoneElse = User::factory()->create();

        foreach ([$squatted, $someoneElse] as $user) {
            DB::table('sessions')->insert(['id' => "session-{$user->id}", 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);
        }

        Socialite::fake('google', (new GoogleUser)
            ->setRaw(['sub' => 'google-123', 'email' => 'milica@example.com', 'email_verified' => true, 'name' => 'Milica Nikolić'])
            ->map(['id' => 'google-123', 'name' => 'Milica Nikolić', 'email' => 'milica@example.com']));

        $this->get(route('auth.google.callback'));

        $this->assertSame(0, DB::table('sessions')->where('id', "session-{$squatted->id}")->count());
        $this->assertSame(1, DB::table('sessions')->where('id', "session-{$someoneElse->id}")->count());
    }

    public function test_a_second_category_of_the_same_name_gets_an_address_of_its_own(): void
    {
        $categories = app(CategoryService::class);

        $this->assertSame('med', $categories->create(['name' => 'Med'])->slug);
        $this->assertSame('med-1', $categories->create(['name' => 'Med'])->slug);
        $this->assertSame('med-2', $categories->create(['name' => 'Med'])->slug);
    }

    public function test_a_bank_account_written_without_dashes_still_makes_a_payment_code(): void
    {
        config(['platform.payment.account' => '160 0000000123456 78']);
        $subscription = app(SubscriptionService::class)->request(Producer::factory()->active()->create(), SubscriptionPlan::where('slug', 'premium')->sole());

        $this->assertStringContainsString('|R:160000000012345678|', app(PaymentSlipService::class)->qrPayload($subscription));
    }

    public function test_a_code_is_refused_without_a_secret_or_when_it_is_not_six_digits(): void
    {
        $twoFactor = app(TwoFactor::class);

        $user = User::factory()->create();

        $this->assertFalse($twoFactor->verify($user, '123456'));

        $twoFactor->begin($user);

        $this->assertFalse($twoFactor->verify($user, '12345a'));
    }

    public function test_cancelling_a_request_that_was_never_paid_tells_nobody(): void
    {
        $producer = Producer::factory()->active()->create();
        $subscription = app(SubscriptionService::class)->request($producer, SubscriptionPlan::where('slug', 'premium')->sole());
        $before = $producer->user->notifications()->count();

        app(CancellationService::class)->cancel($subscription);

        $this->assertSame(ProducerSubscription::STATUS_CANCELLED, $subscription->refresh()->status);
        $this->assertSame($before, $producer->user->notifications()->count());
    }

    public function test_the_admin_link_of_a_finished_campaign_opens_the_ended_tab(): void
    {
        $campaign = Campaign::create(['name' => 'Ajvar sezona', 'slug' => 'ajvar-sezona', 'starts_on' => today()->subMonth(), 'ends_on' => today()->subDay(), 'price_rsd' => 2490, 'is_active' => true]);
        $place = CampaignParticipant::create([
            'campaign_id' => $campaign->id,
            'producer_id' => Producer::factory()->active()->create()->id,
            'status' => CampaignParticipant::STATUS_ACTIVE,
            'reference' => '97-1',
            'amount_rsd' => 2490,
        ]);

        $this->assertStringContainsString('ended', PaidItems::adminUrl($place));
    }

    public function test_the_poster_carries_the_logo_and_is_made_without_one_that_cannot_be_read(): void
    {
        // The PDF library draws a PNG through GD.
        if (! extension_loaded('gd')) {
            $this->markTestSkipped('GD is not installed.');
        }

        Storage::fake(Media::diskName());
        $withLogo = Producer::factory()->active()->create(['logo_path' => 'producers/logos/a.png']);
        $lostLogo = Producer::factory()->active()->create(['logo_path' => 'producers/logos/gone.png']);
        Media::disk()->put('producers/logos/a.png', $this->fakeImage('a.png')->getContent());

        foreach ([$withLogo, $lostLogo] as $producer) {
            $this->actingAs($producer->user)->get(route('producers.poster', $producer))
                ->assertOk()
                ->assertHeader('Content-Type', 'application/pdf');
        }

        $this->assertStringStartsWith('%PDF', app(ProducerPosterPdf::class)->render($withLogo));
    }
}
