<?php

namespace Tests\Feature;

use App\Models\Boost;
use App\Models\Category;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\User;
use App\Services\BoostService;
use App\Support\NotificationText;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Lang;
use Tests\TestCase;

/**
 * Every occasion reaches someone: producers hear about what happens to what
 * they paid for, and admins about everything that waits on them - each with
 * a sentence in the reader's language and a page to open.
 */
class NotificationCoverageTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
    }

    /** @return list<string> */
    private function typesFor(User $user): array
    {
        return $user->notifications()->get()->pluck('data.type')->all();
    }

    public function test_every_type_has_a_sentence(): void
    {
        $types = [
            'producer.approved', 'producer.verified', 'producer.blocked', 'producer.resumed', 'producer.incomplete', 'founding.granted',
            'change-request.approved', 'change-request.rejected', 'product.published',
            'review.received', 'review.published', 'weekly-pick',
            'membership.requested', 'membership.activated', 'membership.ending', 'membership.expired', 'membership.cancelled',
            'boost.requested', 'boost.activated', 'boost.ending', 'boost.expired', 'boost.cancelled',
            'campaign.requested', 'campaign.joined', 'campaign.cancelled',
            'product.available', 'product.wanted', 'product.blocked', 'certificate.approved', 'certificate.rejected',
            'referral.rewarded', 'referral.welcome',
            'admin.certificate-pending', 'post.published', 'post.blocked', 'admin.post-published',
            'admin.producer-pending', 'admin.membership-requested', 'admin.boost-requested', 'admin.campaign-requested',
            'admin.review-pending', 'admin.report-opened', 'admin.change-requested',
            'wanted.posted', 'wanted.blocked', 'admin.wanted-posted',
        ];

        foreach ($types as $type) {
            $this->assertTrue(Lang::has("notifications.{$type}.title"), "No sentence for {$type}");
        }
    }

    public function test_admins_hear_about_what_waits_on_them(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->post(route('producers.store'), ['name' => 'Novi salaš', 'city' => 'Pirot']);
        $this->assertContains('admin.producer-pending', $this->typesFor($this->admin));

        $producer = Producer::factory()->active()->create();
        $buyer = User::factory()->create();
        ProducerMessage::create(['producer_id' => $producer->id, 'buyer_id' => $buyer->id, 'sender_id' => $buyer->id, 'body' => 'Pitanje']);
        ProducerMessage::create(['producer_id' => $producer->id, 'buyer_id' => $buyer->id, 'sender_id' => $producer->user_id, 'body' => 'Odgovor']);
        $this->actingAs($buyer)->post(route('reviews.store', $producer), ['rating' => 5]);
        $this->actingAs($buyer)->post(route('reports.store'), ['reportable_type' => 'producer', 'reportable_id' => $producer->id, 'reason' => 'spam']);

        $types = $this->typesFor($this->admin);
        $this->assertContains('admin.review-pending', $types);
        $this->assertContains('admin.report-opened', $types);

        // And the sentence reads with its facts filled in.
        $pending = $this->admin->notifications()->get()->firstWhere('data.type', 'admin.producer-pending');
        $this->assertSame('„Novi salaš” (Pirot).', NotificationText::for($pending->data)['body']);
    }

    public function test_a_boost_is_announced_from_slip_to_end(): void
    {
        $producer = Producer::factory()->active()->create();
        $boosts = app(BoostService::class);

        $boost = $boosts->request($producer, $producer);
        $this->assertContains('boost.requested', $this->typesFor($producer->user));
        $this->assertContains('admin.boost-requested', $this->typesFor($this->admin));

        $boosts->confirm($boost, $this->admin->id);
        $this->travel(156)->hours();
        $this->artisan('memberships:process-expiries');
        $this->artisan('memberships:process-expiries');

        $this->assertSame(1, collect($this->typesFor($producer->user))->filter(fn ($type) => $type === 'boost.ending')->count());

        $this->travel(1)->days();
        $this->artisan('memberships:process-expiries');

        $this->assertSame(Boost::STATUS_EXPIRED, $boost->refresh()->status);
        $this->assertContains('boost.expired', $this->typesFor($producer->user));
    }

    /** Rows stored before sentences moved to translation files still read. */
    public function test_older_notifications_keep_their_stored_words(): void
    {
        $legacy = new DatabaseNotification(['data' => ['type' => 'producer.approved', 'title' => 'Stari naslov', 'body' => 'Stari tekst', 'url' => '/']]);

        $this->assertSame(['title' => 'Stari naslov', 'body' => 'Stari tekst'], NotificationText::for($legacy->data));
    }

    public function test_the_bell_and_the_page_show_the_sentence(): void
    {
        $category = Category::factory()->create();
        $this->actingAs(User::factory()->create())->post(route('producers.store'), [
            'name' => 'Pčelarstvo',
            'products' => [['name' => 'Med', 'category_id' => $category->id, 'price' => '900', 'unit' => 'kg', 'stock_quantity' => '3']],
        ]);

        $this->actingAs($this->admin)->get(route('notifications.index'))
            ->assertInertia(fn ($page) => $page->where('notifications.data.0.title', 'Novi proizvođač čeka odobrenje'));
    }
}
