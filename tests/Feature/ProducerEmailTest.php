<?php

namespace Tests\Feature;

use App\Console\Commands\NudgeIncompleteProfiles;
use App\Models\Boost;
use App\Models\Producer;
use App\Models\ProducerSubscription;
use App\Models\Product;
use App\Models\SubscriptionPlan;
use App\Notifications\SiteNotification;
use App\Services\BoostService;
use App\Services\SubscriptionService;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * What a producer is told by e-mail as well as on the site: that something
 * they paid for is about to end, and that a week-old page is still empty.
 */
class ProducerEmailTest extends TestCase
{
    use RefreshDatabase;

    /** @return list<string> */
    private function typesSentByMail(Producer $producer): array
    {
        return Notification::sent($producer->user, SiteNotification::class, fn ($notification, array $channels) => in_array('mail', $channels, true))
            ->map(fn (SiteNotification $notification) => $notification->toArray($producer->user)['type'])
            ->all();
    }

    public function test_a_membership_about_to_end_is_mailed_too(): void
    {
        $this->seed(SubscriptionPlansSeeder::class);
        $producer = Producer::factory()->active()->create();
        $unverified = Producer::factory()->active()->create();
        $unverified->user->forceFill(['email_verified_at' => null])->save();

        foreach ([$producer, $unverified] as $each) {
            app(SubscriptionService::class)->grant($each, SubscriptionPlan::where('slug', 'premium')->sole(), ProducerSubscription::WARN_DAYS_BEFORE - 1);
        }

        Notification::fake();
        $this->artisan('memberships:process-expiries')->assertSuccessful();

        $this->assertSame(['membership.ending'], $this->typesSentByMail($producer));
        // An address nobody confirmed gets the bell only.
        Notification::assertSentTo($unverified->user, SiteNotification::class);
        $this->assertSame([], $this->typesSentByMail($unverified));
    }

    public function test_a_boost_about_to_end_is_mailed_too(): void
    {
        $producer = Producer::factory()->active()->create();
        $boost = app(BoostService::class)->request($producer, $producer);
        $boost->update(['status' => Boost::STATUS_ACTIVE, 'starts_at' => now()->subDays(6), 'ends_at' => now()->addHours(12)]);

        Notification::fake();
        $this->assertSame(1, app(BoostService::class)->warnEnding());

        $this->assertSame(['boost.ending'], $this->typesSentByMail($producer));
    }

    public function test_a_week_old_page_that_is_still_empty_gets_one_reminder(): void
    {
        $empty = Producer::factory()->active()->create(['description' => null, 'story' => null, 'logo_path' => null, 'cover_image_path' => null, 'lat' => null]);
        $pending = Producer::factory()->create(['status' => 'pending', 'description' => null, 'story' => null, 'logo_path' => null, 'lat' => null]);
        $recent = Producer::factory()->active()->create(['description' => null, 'story' => null, 'logo_path' => null, 'lat' => null]);
        $blocked = Producer::factory()->create(['status' => 'blocked', 'description' => null, 'story' => null, 'logo_path' => null, 'lat' => null]);
        $complete = Producer::factory()->active()->create([
            'description' => str_repeat('Pravimo ajvar po receptu naše bake. ', 4), 'story' => 'Počeli smo 1998.', 'logo_path' => 'logos/a.jpg',
            'cover_image_path' => 'covers/a.jpg', 'city' => 'Niš', 'lat' => 43.32, 'lng' => 21.9, 'phone' => '+381601234567', 'delivery_methods' => ['preuzimanje'],
        ]);
        Product::factory()->count(3)->for($complete)->create(['status' => 'active']);

        $this->travel(NudgeIncompleteProfiles::AFTER_DAYS)->days();
        // Opened today: its turn comes in a week.
        $recent->forceFill(['created_at' => now()])->save();

        Notification::fake();
        $this->artisan('producers:nudge-incomplete')->assertSuccessful();

        $this->assertSame(['producer.incomplete'], $this->typesSentByMail($empty));
        $this->assertSame(['producer.incomplete'], $this->typesSentByMail($pending));
        Notification::assertNotSentTo([$recent->user, $blocked->user, $complete->user], SiteNotification::class);

        // A second run the same day, and the next day's run, add nothing.
        $this->artisan('producers:nudge-incomplete');
        $this->travel(1)->days();
        $this->artisan('producers:nudge-incomplete');
        Notification::assertSentToTimes($empty->user, SiteNotification::class, 1);
    }
}
